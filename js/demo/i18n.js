/* Telugu interface strings. Labels built with A.button/A.field/A.heading are translated at build time; the rest are
   translated by exact match when the page is rendered in Telugu (A.translateDom). Unlisted text stays in English. */
(function () {
  const A = window.ILAC;
  A.addTranslations({
    // navigation and page titles
    'Dashboard': 'డ్యాష్‌బోర్డ్', 'Queue & tokens': 'క్యూ & టోకెన్లు', 'Workers': 'కార్మికులు', 'Register worker': 'కార్మికుల నమోదు', 'Grievances': 'ఫిర్యాదులు', 'Field app (Android)': 'క్షేత్ర యాప్ (ఆండ్రాయిడ్)',
    'Skilling groups': 'నైపుణ్య సమూహాలు', 'Conflicts & identity review': 'వివాదాలు & గుర్తింపు సమీక్ష', 'Convergence referrals': 'శాఖల సేవా అభ్యర్థనలు', 'Integration monitoring': 'అనుసంధాన పర్యవేక్షణ',
    'Pendency & escalations': 'పెండింగ్ & ఎస్కలేషన్లు', 'Departmental worklist': 'శాఖ పని జాబితా', 'Employer workspace': 'యజమాని వర్క్‌స్పేస్', 'Education counselling': 'విద్యా కౌన్సెలింగ్', 'Shared calendar': 'ఉమ్మడి క్యాలెండర్',
    'MIS & reports': 'నివేదికలు', 'Configuration console': 'కాన్ఫిగరేషన్ కన్సోల్', 'Placements & follow-up': 'ఉద్యోగ నియామకాలు & ఫాలో-అప్', 'Job mela': 'జాబ్ మేళా', 'My record': 'నా వివరాలు',
    'Home': 'హోమ్', 'Services': 'సేవలు', 'Worker login': 'కార్మికుల లాగిన్', 'Staff login': 'అధికారుల లాగిన్', 'Verify OTP': 'OTP ధృవీకరణ', 'Continue': 'కొనసాగించండి', 'Username': 'వినియోగదారు పేరు', 'Password': 'పాస్‌వర్డ్',
    'Sign in': 'లాగిన్', 'Sign out': 'లాగ్ అవుట్', 'Add session': 'మరొక సెషన్', 'Demo tools': 'డెమో సాధనాలు', 'Welfare schemes & services': 'సంక్షేమ పథకాలు', 'CSC & MeeSeva services': 'ప్రభుత్వ సేవలు',
    // common actions
    'Search': 'వెతకండి', 'Save': 'భద్రపరచండి', 'Next': 'తదుపరి', 'Back': 'వెనుకకు', 'Close': 'మూసివేయండి', 'View': 'వివరాలు', 'Open': 'తెరవండి', 'Cancel': 'రద్దు', 'Remove': 'తొలగించు', 'Print': 'ముద్రించండి', 'Export CSV': 'CSV ఎగుమతి',
    'Yes': 'అవును', 'No': 'కాదు', 'Name': 'పేరు', 'Status': 'స్థితి', 'Purpose': 'ఉద్దేశ్యం', 'Other': 'ఇతర', 'Edit mobile': 'మొబైల్ సవరణ',
    // queue
    'Issue a walk-in token': 'వాక్-ఇన్ టోకెన్ జారీ', 'Tokens today': 'నేటి టోకెన్లు', 'Token': 'టోకెన్', 'Issued': 'జారీ సమయం', 'Call': 'పిలవండి', 'Start registration': 'నమోదు ప్రారంభించండి', 'Now calling': 'ఇప్పుడు పిలుస్తున్నారు',
    'Message language': 'సందేశ భాష', 'Issue token': 'టోకెన్ జారీ చేయండి', 'Call next': 'తదుపరి వారిని పిలవండి', 'New worker registration': 'కొత్త కార్మికుల నమోదు', 'Renewal': 'పునరుద్ధరణ', 'Grievance': 'ఫిర్యాదు', 'Waiting': 'వేచి ఉన్నారు', 'Called': 'పిలిచారు',
    // registration
    'Registry check': 'రిజిస్ట్రీ తనిఖీ', 'Personal & work details': 'వ్యక్తిగత మరియు పని వివరాలు', 'Consent': 'సమ్మతి', 'Household baseline': 'కుటుంబ ప్రాథమిక వివరాలు', 'Documents': 'పత్రాలు', 'Review & submit': 'సమీక్ష మరియు సమర్పణ',
    'Search BOCW registry & verify e-Shram': 'BOCW రిజిస్ట్రీ శోధన & e-Shram ధృవీకరణ', 'Continue to details': 'వివరాలకు కొనసాగండి', 'Save & continue': 'భద్రపరచి కొనసాగండి', 'Record consent & continue': 'సమ్మతి నమోదు చేసి కొనసాగండి',
    'Save baseline & continue': 'ప్రాథమిక వివరాలు భద్రపరచి కొనసాగండి', 'Continue to review': 'సమీక్షకు కొనసాగండి', 'Submit registration': 'నమోదు సమర్పించండి', 'Add document': 'పత్రం చేర్చండి', 'Print acknowledgement': 'రసీదు ముద్రించండి',
    'Registration acknowledged': 'నమోదు రసీదు', 'Acknowledgement': 'రసీదు', 'Full name': 'పూర్తి పేరు', 'Full name (Telugu)': 'పూర్తి పేరు (తెలుగు)', 'Date of birth': 'పుట్టిన తేదీ', 'Gender': 'లింగం', 'Male': 'పురుషుడు', 'Female': 'స్త్రీ',
    'Mobile number': 'మొబైల్ నంబర్', 'Primary trade': 'ప్రధాన వృత్తి', 'Years of experience': 'అనుభవం (సంవత్సరాలు)', 'Bank account held': 'బ్యాంకు ఖాతా ఉందా', 'Smartphone': 'స్మార్ట్‌ఫోన్', 'Notice version': 'నోటీసు వెర్షన్', 'Channel': 'ఛానెల్',
    'Purposes agreed': 'అంగీకరించిన ఉద్దేశ్యాలు', 'Household members': 'కుటుంబ సభ్యులు', 'Relationship': 'సంబంధం', 'Education stage': 'విద్యా దశ', 'Occupation': 'వృత్తి', 'Add member': 'సభ్యుని చేర్చండి', 'Classify as': 'వర్గీకరణ', 'Upload a file': 'ఫైల్ అప్‌లోడ్ చేయండి',
    'Primary language of worker': 'కార్మికుని ప్రధాన భాష', 'Household language': 'కుటుంబ భాష', 'Area type': 'ప్రాంత రకం', 'House type': 'ఇంటి రకం', 'Rice card held': 'రేషన్ కార్డు ఉందా', 'Drinking water source': 'తాగునీటి వనరు', 'LPG connection': 'LPG కనెక్షన్', 'Seasonal migration': 'కాలానుగుణ వలస',
    'Date of birth is required': 'పుట్టిన తేదీ తప్పనిసరి', 'This field is required': 'ఇది తప్పనిసరి', 'Mandatory fields are missing': 'తప్పనిసరి వివరాలు నమోదు కాలేదు',
    'Urban': 'పట్టణం', 'Rural': 'గ్రామీణం', 'Spouse': 'భార్య/భర్త', 'Son': 'కుమారుడు', 'Daughter': 'కుమార్తె', 'Mother': 'తల్లి', 'Father': 'తండ్రి', 'Student': 'విద్యార్థి', 'Home-maker': 'గృహిణి',
    // worker record
    'Worker ID': 'కార్మిక ID', 'Trade': 'వృత్తి', 'Mobile': 'మొబైల్', 'District': 'జిల్లా', 'Profile': 'వివరాలు', 'Household': 'కుటుంబం', 'Timeline': 'కాలక్రమం', 'Referrals': 'సేవా అభ్యర్థనలు', 'Site visits': 'సైట్ సందర్శనలు',
    'Edit mobile number': 'మొబైల్ నంబర్ సవరించండి', 'Raise referral': 'సేవా అభ్యర్థన నమోదు', 'Worker record': 'కార్మిక వివరాలు', 'Workers in scope': 'పరిధిలోని కార్మికులు', 'Open referrals': 'తెరిచిన అభ్యర్థనలు', 'Past service clock': 'గడువు దాటినవి', 'Open grievances': 'తెరిచిన ఫిర్యాదులు',
    // convergence
    'Service clock': 'సేవా గడువు', 'Due date': 'గడువు తేదీ', 'Case ID': 'కేస్ ID', 'Service': 'సేవ', 'Route': 'మార్గం', 'Responsible office': 'బాధ్యత కార్యాలయం', 'Next step': 'తదుపరి దశ', 'Submit referral(s)': 'అభ్యర్థనలు సమర్పించండి', 'Referral slip': 'రెఫరల్ స్లిప్', 'Acknowledgement for': 'రసీదు',
    // device
    'Today’s visits': 'నేటి సందర్శనలు', 'Roster': 'హాజరు జాబితా', 'Safety': 'భద్రత', 'Skilling': 'నైపుణ్యం', 'Register': 'నమోదు', 'Checklist': 'చెక్‌లిస్ట్', 'Sync': 'సింక్', 'Mark all present': 'అందరినీ హాజరుగా గుర్తించండి', 'Sync now': 'ఇప్పుడు సింక్ చేయండి', 'Synchronisation': 'సింక్రనైజేషన్',
    'Safety-session observation': 'భద్రతా సమావేశ పరిశీలన', 'Save observation': 'పరిశీలన భద్రపరచండి', 'Skilling needs': 'నైపుణ్య అవసరాలు', 'Register worker on site': 'సైట్‌లో కార్మికుని నమోదు', 'Download visit & 12-worker roster': 'సందర్శన & 12 మంది జాబితా డౌన్‌లోడ్ చేయండి',
    // counselling / jobmela / mis
    'Book an appointment': 'అపాయింట్‌మెంట్ బుక్ చేయండి', 'Record counselling session': 'కౌన్సెలింగ్ సెషన్ నమోదు', 'Assessment': 'అంచనా', 'Interests': 'ఆసక్తులు', 'Advice': 'సలహా', 'Agreed actions': 'అంగీకరించిన చర్యలు', 'Follow-up': 'ఫాలో-అప్', 'Referrals': 'సేవా అభ్యర్థనలు', 'Sessions & cases': 'సెషన్లు & కేసులు',
    'Household timeline': 'కుటుంబ కాలక్రమం', 'Event': 'కార్యక్రమం', 'Candidates & check-in': 'అభ్యర్థులు & చెక్-ఇన్', 'Interviews': 'ఇంటర్వ్యూలు', 'Live dashboard': 'ప్రత్యక్ష డ్యాష్‌బోర్డ్', 'Walk-in registration': 'వాక్-ఇన్ నమోదు', 'Standard reports': 'ప్రామాణిక నివేదికలు', 'Report builder': 'నివేదిక రూపకల్పన',
    'Total': 'మొత్తం', 'Count': 'సంఖ్య', 'Pinned reports': 'పిన్ చేసిన నివేదికలు', 'Run report': 'నివేదిక చూపించండి', 'State': 'రాష్ట్రం', 'Centre': 'కేంద్రం'
  });

  A.translateDom = root => {
    if (A.lang !== 'te' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement && !['SCRIPT', 'STYLE', 'PRE', 'CODE', 'TEXTAREA'].includes(n.parentElement.tagName) && !(n.parentElement.tagName === 'OPTION' && !n.parentElement.hasAttribute('value')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const t = n.nodeValue.trim();
      const hit = A.te[t] || A.te[t.replace(/\s+/g, ' ')];
      if (hit) n.nodeValue = n.nodeValue.replace(t, hit);
    }
  };
}());
