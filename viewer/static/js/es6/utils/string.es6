import * as _ from 'lodash';

export function removeDomain(string) {
  const removable = [
    'http://libris.kb.se/',
    'https://libris.kb.se/',
    'http://id.kb.se/',
    'https://id.kb.se/',
  ];
  let newValue = string;
  for (let i = 0; i < removable.length; i++) {
    newValue = newValue.replace(removable[i], '');
  }
  return newValue;
}

export function labelByLang(string, lang, vocab, vocabPfx) {
  if (!string) {
    return '[FAILED LABEL]';
  }
  const pfx = vocabPfx;
  // Filter for fetching labels from vocab
  let lbl = string.toString();
  if (lbl && lbl.indexOf(pfx) !== -1) {
    lbl = lbl.replace(pfx, '');
  }
  const item = _.find(vocab.descriptions, (d) => { return d['@id'] === `${pfx}${lbl}`; });
  let labelByLang = '';
  if (typeof item !== 'undefined' && item.labelByLang) {
    labelByLang = item.labelByLang[lang];
  }
  // Check if we have something of value
  if (labelByLang && labelByLang.length > 0) {
    return labelByLang;
  }
  return lbl;
}