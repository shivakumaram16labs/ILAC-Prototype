/* Focused language regression: npm i --no-save puppeteer-core && node tests/language.e2e.mjs.
   PUPPETEER_MODULE may point to an existing Puppeteer installation; CHROME_PATH overrides Chrome. */
import assert from 'node:assert/strict';
import {fileURLToPath, pathToFileURL} from 'node:url';
const module = await import(process.env.PUPPETEER_MODULE || 'puppeteer-core');
const puppeteer = module.default || module.puppeteer;
const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
try {
  const page = await browser.newPage();
  await page.setViewport({width: 1440, height: 1000});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(fileURLToPath(new URL('../index.html', import.meta.url))).href);
  const toggle = () => page.click('[data-action="language"]');
  const text = selector => page.$eval(selector, node => node.textContent);
  const route = async value => {
    await page.evaluate(value => {location.hash = value; ILAC.render();}, value);
    await page.waitForFunction(value => location.hash === '#' + value, {}, value);
  };
  await toggle();
  assert.equal(await page.$eval('html', n => n.lang), 'te');
  assert.equal(await text('.brand-title'), 'డిజిటల్ ILAC');
  assert.match(await text('.brand-sub'), /సమీకృత కార్మిక/);
  assert.match(await text('.hero h1'), /ఒకే కేంద్రం/);
  assert.match(await text('.public-main'), /వివాహ సహాయం/);
  assert.equal(await text('[data-action="language"]'), 'English');
  assert.equal(await page.$eval('.brand img', n => n.alt), 'ఆంధ్రప్రదేశ్ ప్రభుత్వ చిహ్నం');
  await toggle();
  assert.equal(await text('.brand-title'), 'Digital ILAC');
  assert.match(await text('.hero h1'), /One centre/);
  console.log('PASS public header, home content, accessible labels and language toggle');

  const baseline = await page.evaluate(() => {
    ILAC.loginAs('demo.op.ntr');
    return JSON.stringify([ILAC.sheets, ILAC.st.workers, ILAC.st.members, ILAC.st.households]);
  });
  await route('v/workers');
  await toggle();
  assert.match(await text('tbody'), /గొర్లె లక్ష్మి/);
  assert.match(await page.$eval('[name=q]', n => n.placeholder), /కార్మిక ID/);
  assert.deepEqual(await page.evaluate(() => [...ILAC.st.workers, ...ILAC.st.members].filter(p => /[A-Za-z]/.test(ILAC.personName(p, 'te'))).map(p => p.full_name)), []);
  await page.type('[name=q]', 'గొర్లె లక్ష్మి');
  await page.click('#worker-search button');
  assert.match(await text('tbody'), /SYN-W-000607/);
  await route('v/workers/SYN-W-000607');
  assert.equal(await text('.worker-head h2'), 'గొర్లె లక్ష్మి');
  await page.click('[data-action="worker-tab"][data-id="household"]');
  assert.match(await text('tbody'), /[\u0c00-\u0c7f]/);
  await toggle();
  assert.equal(await text('.worker-head h2'), 'Gorle Lakshmi');
  assert.equal(await page.evaluate(() => JSON.stringify([ILAC.sheets, ILAC.st.workers, ILAC.st.members, ILAC.st.households])), baseline);
  console.log('PASS all seeded worker/member display names, Telugu search, household and unchanged source records');

  await page.evaluate(() => {
    const w = {...ILAC.W('SYN-W-000607'), worker_id: 'TEST-LANG', full_name: 'Test Worker', full_name_te: 'పరీక్ష కార్మికుడు'};
    ILAC.st.workers.push(w);ILAC.st.wById.set(w.worker_id, w);
    ILAC.workerQuery = 'Test Worker';ILAC.workerTab = 'profile';
  });
  await route('v/workers/TEST-LANG');
  assert.equal(await text('.worker-head h2'), 'Test Worker');
  await toggle();
  assert.equal(await text('.worker-head h2'), 'పరీక్ష కార్మికుడు');
  await route('v/workers');
  assert.match(await text('tbody'), /పరీక్ష కార్మికుడు/);
  await toggle();
  assert.match(await text('tbody'), /Test Worker/);
  assert.doesNotMatch(await text('tbody'), /పరీక్ష కార్మికుడు/);
  console.log('PASS recorded Telugu spelling takes priority and English restores the original name');

  await page.evaluate(() => {ILAC.reg = ILAC.newRegDraft();ILAC.reg.stage = 3;ILAC.reg.persona = 'P-01';});
  await route('v/register');
  await page.click('[data-action="hh-fill"]');
  await page.type('[name=m_name]', 'Unsaved member');
  const values = () => page.$eval('#reg-household-form', f => Object.fromEntries(new FormData(f)));
  const before = await values();
  await toggle();
  assert.deepEqual(await values(), before);
  assert.equal(await page.$eval('[name=hh_house_type] option:checked', n => n.textContent), 'సొంత పాక్షిక పక్కా ఇల్లు');
  assert.match(await text('tbody'), /కోన పద్మ/);
  await toggle();
  assert.deepEqual(await values(), before);
  assert.equal(await page.$eval('[name=hh_house_type] option:checked', n => n.textContent), 'Semi-pucca - own');
  await toggle();
  await page.click('#reg-household-form button[type=submit]');
  assert.equal(await page.evaluate(() => ILAC.reg.stage), 4);
  assert.equal(await page.evaluate(() => ILAC.reg.hh.house_type), 'Semi-pucca - own');
  assert.equal(await page.evaluate(() => ILAC.reg.hh.rice_card_held), 'Yes');
  console.log('PASS household autofill, unsaved drafts, canonical select values and Telugu form submission');

  await page.evaluate(() => {
    ILAC.reg.stage = 1;ILAC.reg.f = {name: 'Test Worker', name_te: 'పరీక్ష కార్మికుడు', gender: 'Male', bank: 'Yes', smartphone: 'No', trade: 'Mason'};ILAC.render();
  });
  assert.equal(await page.$eval('[name=trade]', n => n.value), 'Mason');
  assert.equal(await page.$eval('[name=trade] option:checked', n => n.textContent), 'తాపీ మేస్త్రీ');
  assert.equal(await page.$eval('[name=bank]', n => n.value), 'Yes');
  assert.equal(await page.$eval('[name=smartphone]', n => n.value), 'No');
  assert.equal(await page.$eval('[name=name_te]', n => n.value), 'పరీక్ష కార్మికుడు');
  assert.deepEqual(errors, []);
  console.log('PASS registration options and bilingual input fields; no browser errors');
} finally {
  await browser.close();
}
