import * as httpUtil from './http';
import * as _ from 'lodash';

export function getVocab() {
  return new Promise((resolve, reject) => {
    httpUtil.getResourceFromCache('/https://id.kb.se/vocab/').then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

export function getContext() {
  return new Promise((resolve, reject) => {
    httpUtil.getResourceFromCache('/context.jsonld').then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

export function getForcedListTerms() {
  return new Promise((resolve, reject) => {
    httpUtil.getResourceFromCache('/sys/forcedsetterms.json').then((result) => {
      resolve(result);
    }, (error) => {
      reject(error);
    });
  });
}

export function getRecordType(mainEntityType, vocab, settings) {
  if (isSubClassOf(mainEntityType, 'Item', vocab, settings.vocabPfx)) {
    return 'Item';
  }
  if (isSubClassOf(mainEntityType, 'Instance', vocab, settings.vocabPfx)) {
    return 'Instance';
  } else if (isSubClassOf(mainEntityType, 'Work', vocab, settings.vocabPfx)) {
    return 'Work';
  } else if (isSubClassOf(mainEntityType, 'Agent', vocab, settings.vocabPfx)) {
    return 'Agent';
  } else if (isSubClassOf(mainEntityType, 'Concept', vocab, settings.vocabPfx)) {
    return 'Concept';
  }
  throw new Error(`Could not determine baseclass for this record. Connection is missing in vocab for class "${mainEntityType}".`);
}

export function getTermByType(type, list) {
  if (!list || typeof list === 'undefined') {
    throw new Error('getTermByType was called without a vocabulary.');
  }
  const termList = _.filter(list, (term) => {
    if (_.isArray(term['@type'])) {
      return term['@type'].indexOf(type) > -1;
    } else {
      return term['@type'] === type;
    }
  });
  return termList;
}

export function getTermFromLabel(label, language, vocab) {
  const classObject = _.find(vocab, (obj) => {
    let existingLang = language;
    if (typeof obj.labelByLang === 'undefined') {
      return false;
    } else if (typeof obj.labelByLang[language] === 'undefined') {
      existingLang = 'en';
    }
    if (_.isArray(obj.labelByLang[existingLang])) {
      for (const lbl of obj.labelByLang[existingLang]) {
        if (lbl.toLowerCase() === label.toLowerCase()) {
          return true;
        }
      }
    } else {
      return obj.labelByLang[existingLang].toLowerCase() === label.toLowerCase();
    }
  });
  return classObject;
}

export function getTermObject(term, vocab, vocabPfx) {
  // Returns a class object
  if (!term || typeof term === 'undefined') {
    throw new Error('getTermObject was called with an undefined Id.');
  }
  if (_.isObject(term)) {
    throw new Error('getTermObject was called with an object (should be a string).');
  }
  if (term.indexOf('@') !== -1) {
    return {};
  }
  let cn = term;
  if (term.indexOf('marc/') === -1) {
    cn = term.replace(vocabPfx, '');
    cn = `${vocabPfx}${cn}`;
  }
  let _class = vocab.get(cn);

  if (!_class && cn.indexOf('marc:') !== -1) {
    const cnParts = cn.split('/');
    cn = 'https://id.kb.se/' + cnParts[cnParts.length - 1];
    cn = cn.replace('marc:', 'marc/');
    _class = vocab.get(cn);
  }

  if (!_class) {
    // console.warn('Not found in vocab:', cn);
  }
  return _class;
}

export function getPropertyTypes(propertyId, vocab, vocabPfx) {
  if (propertyId.indexOf('@') !== -1) {
    return [];
  }
  const property = getTermObject(propertyId, vocab, vocabPfx);
  if (property) {
    const typeAttr = property['@type'].toString();
    let types = [];
    if (typeAttr.indexOf(',')) {
      types = typeAttr.split(',');
    } else {
      types = [typeAttr];
    }
    return types;
  }
  return [];
}

export function getAllEnumerationTypesFor(onProp, vocab) {
  const enumerationTypes = [];
  vocab.forEach(term => {
    if (term.hasOwnProperty('subClassOf')) {
      _.each(term.subClassOf, (superClassObj) => {
        if (superClassObj.hasOwnProperty('@type') && superClassObj['@type'] === 'Restriction') {
          if (superClassObj.onProperty['@id'] === onProp) {
            if (superClassObj.hasOwnProperty('someValuesFrom')) {
              enumerationTypes.push(superClassObj.someValuesFrom['@id']);
            }
          }
        }
      });
    }
  });
  return enumerationTypes;
}

export function getRange(propertyId, vocab, vocabPfx) {
  const property = getTermObject(propertyId, vocab, vocabPfx);
  let range = [];
  if (!property) {
    return range;
  }
  if (property.range) {
    for (let i = 0; i < property.range.length; i++) {
      range.push(property.range[i]['@id']);
    }
  }
  if (property.hasOwnProperty('subPropertyOf')) {
    _.each(property.subPropertyOf, (prop) => {
      range = range.concat(getRange(prop['@id'], vocab, vocabPfx));
    });
  }
  range = _.uniq(range);
  return range;
}

export function getSubClasses(classname, vocab, vocabPfx) {
  const subClasses = [];
  vocab.forEach((o) => {
    if (o.subClassOf) {
      for (let i = 0; i < o.subClassOf.length; i++) {
        if (o.subClassOf[i].hasOwnProperty('@id') && o.subClassOf[i]['@id'] === vocabPfx + classname) {
          subClasses.push(o['@id']);
        }
      }
    }
  });
  if(!subClasses && subClasses.length === 0) {
    console.warn('subclasses for', vocabPfx + classname, 'not found in vocab');
  }
  return subClasses;
}

export function getAllSubClasses(classArray, vocab, vocabPfx) {
  let inputSubClasses = [].concat(classArray);
  let newSubClasses = [];
  if (inputSubClasses.length > 0) {
    _.each(inputSubClasses, classId => {
      const className = classId.replace(vocabPfx, '');
      const subClasses = getSubClasses(className, vocab, vocabPfx);
      if (subClasses.length > 0) {
        newSubClasses = newSubClasses.concat(getAllSubClasses(subClasses, vocab, vocabPfx));
      }
    });
  }
  inputSubClasses = inputSubClasses.concat(newSubClasses);
  inputSubClasses = _.uniq(inputSubClasses);
  return inputSubClasses;
}

export function getFullRange(key, vocab, vocabPfx) {
  const types = [].concat(getRange(key, vocab, vocabPfx));
  let allTypes = [];
  _.each(types, type => {
    const typeInArray = [].concat(type);
    allTypes = allTypes.concat(getAllSubClasses(typeInArray, vocab, vocabPfx));
  });
  allTypes = _.uniq(allTypes);
  return allTypes;
}


export function getDomainList(property, vocab, vocabPfx) {
  if (property['@type'] === 'Class') {
    return false;
  }
  let domainList = [];
  if (property.hasOwnProperty('domain')) {
    domainList = domainList.concat(property.domain);
  }
  if (property.hasOwnProperty('domainIncludes')) {
    domainList = domainList.concat(property.domainIncludes);
  }
  if (property.hasOwnProperty('subPropertyOf')) {
    for (const superPropNode of property.subPropertyOf) {
      if (superPropNode['@id'] && superPropNode['@id'].indexOf(vocabPfx) !== -1) {
        const superProp = getTermObject(superPropNode['@id'], vocab, vocabPfx);
        if (superProp) {
          domainList = domainList.concat(getDomainList(superProp, vocab, vocabPfx));
        }
      }
    }
  }
  return domainList;
}

export function getProperties(className, vocab, vocabPfx, vocabProperties) {
  // Get all properties which has the domain of the className
  const props = [];
  const cn = className.replace(vocabPfx, '');
  // console.log("Getting props for", className);
  vocabProperties.forEach(prop => {
    const domainList = getDomainList(prop, vocab, vocabPfx);
    const classId = vocabPfx + cn;
    for (const domain of domainList) {
      if (domain['@id'] === classId) {
        props.push(prop);
      }
    }
  });

  // HARDCODED INCLUDE OF GENERAL PROPERTIES
  // TODO: Remove when label has a domain
  const labelProperty = getTermObject('label', vocab, vocabPfx);
  props.push(labelProperty);
  const noteProperty = getTermObject('note', vocab, vocabPfx);
  props.push(noteProperty);
  const valueProperty = getTermObject('value', vocab, vocabPfx);
  props.push(valueProperty);
  // end HARDCODED

  return props;
}

export function getBaseClasses(classId, vocab, vocabPfx) {
  // Traverses up subClassOf properties and returns a list of all classes found

  if (!classId || typeof classId === 'undefined') {
    throw new Error('getBaseClasses was called with an undefined Id.');
  }

  let classList = [];
  const termObj = getTermObject(classId, vocab, vocabPfx);
  if (typeof termObj === 'undefined') {
    return _.uniq(classList);
  }
  classList.push(termObj['@id']);
  if (termObj && termObj.hasOwnProperty('subClassOf')) {
    for (let i = 0; i < termObj.subClassOf.length; i++) {
      const baseClassId = termObj.subClassOf[i]['@id'];
      let baseClass = {};
      if (baseClassId) {
        baseClass = getTermObject(baseClassId, vocab, vocabPfx);
      }
      if (
        baseClass &&
        baseClass.isDefinedBy &&
        baseClass.isDefinedBy['@id'] === vocabPfx
      ) {
        classList = classList.concat(getBaseClasses(baseClassId, vocab, vocabPfx));
        classList.push(baseClassId);
      } else {
        //
      }
    }
  }
  // console.log("getBaseClasses(" + JSON.stringify(classId) + ")", JSON.stringify(classList));
  return _.uniq(classList);
}

export function getBaseClassesFromArray(typeArray, vocab, vocabPfx) {
  // Find the base classes from the types in typeArray and return a list of IDs.
  if (!typeArray || typeArray.length === 0) {
    throw new Error('getBaseClassesFromArray was called without types');
  }
  const types = [].concat(typeArray);

  let classes = [];
  for (let t = 0; t < types.length; t++) {
    if (types[t].indexOf('marc:') === -1) {
      const c = getTermObject(types[t], vocab, vocabPfx);
      if (typeof c !== 'undefined') {
        classes.push(c['@id']);
        classes = classes.concat(getBaseClasses(c['@id'], vocab, vocabPfx));
      }
    }
  }
  classes = _.uniq(classes);
  // console.log("getBaseClassesFromArray("+JSON.stringify(typeArray)+") ->", JSON.stringify(classes));
  return classes;
}

export function hasValuesInVocab(propertyId, context) {
  if (context[1].hasOwnProperty(propertyId)) {
    if (context[1][propertyId]['@type'] === '@vocab') {
      return true;
    }
  }
  return false;
}

export function isSubClassOf(classId, baseClassId, vocab, vocabPfx) {
  if (!classId || typeof classId === 'undefined') {
    throw new Error('isSubClassOf was called without a classId or classId array');
  }
  if (!baseClassId || typeof baseClassId === 'undefined') {
    throw new Error('isSubClassOf was called without a baseClassId');
  }

  let baseClasses;
  if (_.isArray(classId)) {
    baseClasses = getBaseClassesFromArray(classId, vocab, vocabPfx);
  } else {
    baseClasses = getBaseClasses(classId, vocab, vocabPfx);
  }
  if (baseClasses.indexOf(`${vocabPfx}${baseClassId}`) > -1) {
    return true;
  }
  return false;
}

export function getPropertiesFromArray(typeArray, vocab, vocabPfx, vocabProperties) {
  let props = [];
  const classNames = getBaseClassesFromArray(typeArray, vocab, vocabPfx);

  for (let i = 0; i < classNames.length; i++) {
    const properties = getProperties(classNames[i], vocab, vocabPfx, vocabProperties);
    for (let x = 0; x < properties.length; x++) {
      const p = {
        item: properties[x],
      };
      props.push(p);
    }
  }
  props = _.uniqBy(props, 'item.@id');
  return props;
}

export function isEmbedded(classId, vocab, settings) {
  if (!classId || typeof classId === 'undefined') {
    throw new Error('isEmbedded was called with an undedfined class id');
  }
  if (_.isObject(classId)) {
    throw new Error('isEmbedded was called with an object as class id (should be a string)');
  }
  const embeddedTypes = settings.embeddedTypes;
  const typeChain = getBaseClasses(classId, vocab, settings.vocabPfx);
  if (typeChain.length > 0) {
    for (const item of embeddedTypes) {
      if (~typeChain.indexOf(`${settings.vocabPfx}${item}`)) {
        return true;
      }
    }
  }
  return false;
}

export function getInstances(className, vocab, vocabPfx) {
  const instances = [];
  vocab.forEach(vocabObj => {
    if (typeof vocabObj['@type'] !== 'undefined' && vocabObj['@type'].indexOf(`${className}`) > -1) {
      instances.push(vocabObj['@id'].replace(vocabPfx, ''));
    }
  });
  return instances;
}

export function getEnumerationKeys(entityType, property, vocab, vocabPfx) {

  if (_.isPlainObject(property)) {
    throw new Error('getEnumerationKeys was called with an object as property id (should be a string)');
  }

  let result = [];
  const baseClasses = getBaseClasses(`${vocabPfx}${entityType}`, vocab, vocabPfx);
  baseClasses.forEach(baseClass => {
    const vocabEntry = vocab.get(baseClass);
    if (vocabEntry.hasOwnProperty('subClassOf')) {
      vocabEntry.subClassOf.forEach(subClassObject => {
        if (subClassObject.hasOwnProperty('@type') && subClassObject['@type'] === 'Restriction') {
          if (subClassObject.onProperty['@id'] === `${vocabPfx}${property}`) {
            if (subClassObject.hasOwnProperty('someValuesFrom')) {
              if (_.isArray(subClassObject.someValuesFrom)) {
                _.each(subClassObject.someValuesFrom, (list) => {
                  result.push(list['@id']);
                });
              } else {
                result = [subClassObject.someValuesFrom['@id']];
              }
            }
          }
        }
      });
    }
  });
  if (result.length === 0) {
    const propObj = vocab.get(property);
    if (propObj && propObj.hasOwnProperty('rangeIncludes')) {
      result = propObj.rangeIncludes.map(item => item['@id']);
    }
  }
  return result;
}

export function getEnumerations(entityType, property, vocab, vocabPfx) {
  const enumerationKeys = getEnumerationKeys(entityType, property, vocab, vocabPfx)
  .map(enumerationKey => `@type=${enumerationKey}`);
  if (enumerationKeys.length > 0) {
    const enumerationUrl = enumerationKeys.join('&');
    return new Promise((resolve, reject) => {
      httpUtil.get({ url: `/find?${enumerationUrl}`, accept: 'application/ld+json' }).then((response) => {
        resolve(response.items);
      }, (error) => {
        reject('Error searching...', error);
      });
    });
  }
  const enumerationTypesUrl = getAllEnumerationTypesFor(`${vocabPfx}${property}`, vocab, vocabPfx)
    .map(enumerationType => `@type=${enumerationType}`)
    .join('&');
  return new Promise((resolve, reject) => {
    httpUtil.get({ url: `/find?@type=${enumerationTypesUrl}`, accept: 'application/ld+json' }).then((response) => {
      resolve(response.items);
    }, (error) => {
      reject('Error searching...', error);
    });
  });
}
