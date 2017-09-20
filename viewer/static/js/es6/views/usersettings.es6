import View from './view';
import * as UserUtil from '../utils/user';
import * as StringUtil from '../utils/string';

export default class UserSettings extends View {

  initialize() {
    super.initialize();
    const self = this;
    document.title = `${StringUtil.getUiPhraseByLang('Settings', this.getLanguage())} - ${this.settings.siteInfo.title}`;

    $('#switchLocation').val(this.getSigel());

    this.updateSigelButtons();
    this.updateLanguageButtons();

    $('.sigel-button').click(function() {
      self.changeSigel($(this).val());
    });

    $('.language-button').click(function() {
      self.changeLanguage($(this).val());
    });
  }

  updateSigelButtons() {
    const sigel = this.getSigel();
    $('.sigel-option').each(function () {
      $(this).removeClass('active');
      if ($(this).find('.sigel-button').val() === sigel) {
        $(this).addClass('active');
      }
    });
  }
  updateLanguageButtons() {
    const language = this.getLanguage();
    $('.language-option').each(function () {
      $(this).removeClass('active');
      if ($(this).find('.language-button').val() === language) {
        $(this).addClass('active');
      }
    });
  }

  getLanguage() {
    return this.settings.userSettings.language || this.settings.language;
  }

  getSigel() {
    return this.settings.userSettings.currentSigel;
  }

  changeSigel(sigel) {
    this.settings.userSettings.currentSigel = sigel;
    UserUtil.saveUserSettings(this.settings.userSettings);
    $('.sigelLabel').text(`(${this.settings.userSettings.currentSigel})`);
    this.updateSigelButtons();
  }

  changeLanguage(langCode) {
    this.settings.userSettings.language = langCode;
    UserUtil.saveUserSettings(this.settings.userSettings);
    this.updateLanguageButtons();
    this.translate();
  }
}
