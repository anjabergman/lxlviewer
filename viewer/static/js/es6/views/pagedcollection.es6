import View from './view';
import Vue from 'vue';
import Vuex from 'vuex';
import store from '../vuex/store';
import * as _ from 'lodash';
import * as StringUtil from '../utils/string';
import * as SearchUtil from '../utils/search';
import * as LayoutUtil from '../utils/layout';
import * as VocabUtil from '../utils/vocab';
import * as DisplayUtil from '../utils/display';
import * as httpUtil from '../utils/http';
import ComboKeys from 'combokeys';
import KeyBindings from '../keybindings.json';
import ServiceWidgetSettings from '../serviceWidgetSettings.json';
import Copy from '../copy.json';
import MainSearchField from '../components/main-search-field';
import FacetControls from '../components/facet-controls';
import SearchResultComponent from '../components/search-result-component';
import EntitySearchList from '../components/entity-search-list';
import SearchForm from '../components/search-form';
import DatasetObservations from '../components/dataset-observations';
import LandingBox from '../components/landing-box';
import LinkCardComponent from '../components/link-card-component';
import IntroComponent from '../components/intro-component';
import HelpComponent from '../components/help-component';
import { getSettings, getVocabulary, getDisplayDefinitions, getEditorData, getKeybindState, getStatus } from '../vuex/getters';
import { changeSettings, changeStatus, changeNotification, loadVocab, loadVocabMap, loadDisplayDefs, changeSavedStatus, changeResultListStatus } from '../vuex/actions';

export default class PagedCollection extends View {

  initialize() {
    super.initialize();
    // SearchUtil.initTypeButtons();
    // SearchUtil.initializeSearch();

    const self = this;
    this.dataIn = JSON.parse(document.getElementById('data').innerText);

    VocabUtil.getVocab().then((vocab) => {
      self.vocab = vocab['@graph'];
      self.vocabMap = new Map(vocab['@graph'].map((entry) => [entry['@id'], entry]));
      DisplayUtil.getDisplayDefinitions().then((display) => {
        self.display = display;
        self.initVue();
      }, (error) => {
        // showError(error);
      });
    }, (error) => {
      // showError(error);
    });
  }

  initVue() {
    const self = this;

    document.getElementById('body-blocker').addEventListener('click', function () {
      self.vm.$broadcast('close-modals');
    }, false);

    Vue.filter('labelByLang', (label) => {
      return StringUtil.labelByLang(label, self.settings.language, self.vocabMap, self.settings.vocabPfx);
    });
    Vue.filter('removeDomain', (value) => {
      return StringUtil.removeDomain(value, self.settings.removableBaseUris);
    });
    Vue.filter('translatePhrase', (string) => {
      return StringUtil.getUiPhraseByLang(string, self.settings.language);
    });

    Vue.use(Vuex);

    self.vm = new Vue({
      el: '#pagedcollection',
      vuex: {
        actions: {
          loadVocab,
          loadVocabMap,
          loadDisplayDefs,
          changeSettings,
          changeStatus,
          changeSavedStatus,
          changeNotification,
          changeResultListStatus,
        },
        getters: {
          status: getStatus,
          settings: getSettings,
          editorData: getEditorData,
          vocab: getVocabulary,
          display: getDisplayDefinitions,
          keybindState: getKeybindState,
        },
      },
      data: {
        initialized: false,
        combokeys: null,
        result: {},
      },
      events: {
        newresult(resultPromise) {
          this.changeResultListStatus('error', false);
          resultPromise.then((result) => {
            this.result = result;
            this.changeResultListStatus('loading', false);
          }, (error) => {
            this.changeResultListStatus('error', true);
            this.changeResultListStatus('loading', false);
            this.changeResultListStatus('info', 'Could not find result');
            console.log(error);
          });
        },
        'show-help': function(value) {
          LayoutUtil.scrollLock(true);
          this.changeStatus('keybindState', 'help-window');
          this.changeStatus('showHelp', true);
          this.changeStatus('helpSection', value);
        },
      },
      watch: {

      },
      methods: {
        isArray(o) {
          return _.isArray(o);
        },
        isPlainObject(o) {
          return _.isPlainObject(o);
        },
        showHelp() {
          this.$dispatch('show-help', '');
        },
        widgetShouldBeShown(id) {
          if (!this.isLandingPage) {
            return false;
          }
          const componentList = ServiceWidgetSettings[this.settings.siteInfo.title];
          if (!componentList.hasOwnProperty(id)) {
            return false;
          }
          if (
            (componentList[id].hasOwnProperty('forced') && componentList[id].forced === true) ||
            // TODO: Don't read standard here, read from user settings and init as active in user settings if standard
            (componentList[id].hasOwnProperty('standard') && componentList[id].standard)
          ) {
            return true;
          }
          return false;
        },
      },
      computed: {
        isLibris() {
          return this.settings.siteInfo.title === 'libris.kb.se';
        },
        isLandingPage() {
          return typeof this.result.totalItems === 'undefined';
        },
        copy() {
          return Copy[this.settings.siteInfo.title];
        },
      },
      beforeCompile() {
        this.changeResultListStatus('loading', true);
      },
      ready() {
        this.changeSettings(self.settings);
        this.loadVocab(self.vocab);
        this.loadVocabMap(self.vocabMap);
        this.loadDisplayDefs(self.display);
        this.result = self.dataIn;
        document.title = `${StringUtil.getUiPhraseByLang('Search', this.settings.language)} - ${this.settings.siteInfo.title}`;
        if (Modernizr.history) {
          history.replaceState(this.result, 'unused');
          history.scrollRestoration = 'manual';
          window.onpopstate = e => {
            e.preventDefault();
            this.changeResultListStatus('loading', true);
            const resultPromise = new Promise((resolve, reject) => {
              if (e.state !== null) {
                resolve(e.state);
              } else {
                reject(Error('State error'));
              }
            });
            this.$dispatch('newresult', resultPromise);
            return false;
          };
        }
        this.changeResultListStatus('loading', false);
        LayoutUtil.showPage(this);
      },
      components: {
        'main-search-field': MainSearchField,
        'facet-controls': FacetControls,
        'search-result-component': SearchResultComponent,
        'entity-search-list': EntitySearchList,
        'search-form': SearchForm,
        'dataset-observations': DatasetObservations,
        'landing-box': LandingBox,
        'help-component': HelpComponent,
        'intro-component': IntroComponent,
        'link-card': LinkCardComponent,
      },
      store,
    });
  }
}
