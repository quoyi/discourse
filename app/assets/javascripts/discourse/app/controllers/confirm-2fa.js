import Controller from "@ember/controller";
import { SECOND_FACTOR_METHODS } from "discourse/models/user";
import I18n from "I18n";
import { ajax } from "discourse/lib/ajax";
import bootbox from "bootbox";
import { extractError } from "discourse/lib/ajax-error";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { alias, or, readOnly, equal } from "@ember/object/computed";
import { getWebauthnCredential } from "discourse/lib/webauthn";

export default Controller.extend({
  TOTP: SECOND_FACTOR_METHODS.TOTP,
  SECURITY_KEY: SECOND_FACTOR_METHODS.SECURITY_KEY,
  BACKUP_CODE: SECOND_FACTOR_METHODS.BACKUP_CODE,

  userSelectedMethod: null,
  errorMessage: null,

  totpEnabled: readOnly("model.totp_enabled"),
  securityKeysEnabled: readOnly("model.security_keys_enabled"),
  backupCodesEnabled: readOnly("model.backup_enabled"),

  showTotpForm: equal("shownSecondFactorMethod", SECOND_FACTOR_METHODS.TOTP),
  showSecurityKeyForm: equal(
    "shownSecondFactorMethod",
    SECOND_FACTOR_METHODS.SECURITY_KEY
  ),
  showBackupCodesForm: equal(
    "shownSecondFactorMethod",
    SECOND_FACTOR_METHODS.BACKUP_CODE
  ),

  @discourseComputed(
    "userSelectedMethod",
    "securityKeysEnabled",
    "totpEnabled",
    "backupCodesEnabled"
  )
  shownSecondFactorMethod(
    userSelectedMethod,
    securityKeysEnabled,
    totpEnabled,
    backupCodesEnabled
  ) {
    if (userSelectedMethod !== null) {
      return userSelectedMethod;
    } else {
      if (securityKeysEnabled) {
        return SECOND_FACTOR_METHODS.SECURITY_KEY;
      } else if (totpEnabled) {
        return SECOND_FACTOR_METHODS.TOTP;
      } else if (backupCodesEnabled) {
        return SECOND_FACTOR_METHODS.BACKUP_CODE;
      } else {
        throw new Error("unpexected state of user 2fa settings!");
      }
    }
  },

  @discourseComputed(
    "shownSecondFactorMethod",
    "securityKeysEnabled",
    "totpEnabled",
    "backupCodesEnabled"
  )
  alternativeMethods(
    shownSecondFactorMethod,
    securityKeysEnabled,
    totpEnabled,
    backupCodesEnabled
  ) {
    const alts = [];
    if (securityKeysEnabled && shownSecondFactorMethod != this.SECURITY_KEY) {
      alts.push({
        id: this.SECURITY_KEY,
        translationKey: "login.second_factor_toggle.security_key",
      });
    }

    if (totpEnabled && shownSecondFactorMethod != this.TOTP) {
      alts.push({
        id: this.TOTP,
        translationKey: "login.second_factor_toggle.totp",
      });
    }

    if (backupCodesEnabled && shownSecondFactorMethod != this.BACKUP_CODE) {
      alts.push({
        id: this.BACKUP_CODE,
        translationKey: "login.second_factor_toggle.backup_code",
      });
    }

    return alts;
  },

  @discourseComputed("shownSecondFactorMethod")
  secondFactorTitle(shownSecondFactorMethod) {
    switch (shownSecondFactorMethod) {
      case SECOND_FACTOR_METHODS.TOTP:
        return I18n.t("login.second_factor_title");
      case SECOND_FACTOR_METHODS.SECURITY_KEY:
        return I18n.t("login.second_factor_title");
      case SECOND_FACTOR_METHODS.BACKUP_CODE:
        return I18n.t("login.second_factor_backup_title");
    }
  },

  @discourseComputed("shownSecondFactorMethod")
  secondFactorDescription(shownSecondFactorMethod) {
    switch (shownSecondFactorMethod) {
      case SECOND_FACTOR_METHODS.TOTP:
        return I18n.t("login.second_factor_description");
      case SECOND_FACTOR_METHODS.SECURITY_KEY:
        return I18n.t("login.security_key_description");
      case SECOND_FACTOR_METHODS.BACKUP_CODE:
        return I18n.t("login.second_factor_backup_description");
    }
  },

  verifySecondFactor(data) {
    return ajax("/session/confirm-2fa", {
      type: "POST",
      data: {
        ...data,
        second_factor_method: this.shownSecondFactorMethod,
      },
    });
  },

  @action
  onTokenInput() {
    console.log(...arguments);
  },

  @action
  useAnotherMethod(newMethod) {
    this.set("userSelectedMethod", newMethod);
  },

  @action
  authenticateSecurityKey() {
    getWebauthnCredential(
      this.model.challenge,
      this.model.allowed_credential_ids,
      (credentialData) => {
        this.verifySecondFactor({ second_factor_token: credentialData });
      },
      (errorMessage) => {
        this.set("errorMessage", errorMessage);
      }
    );
  },
});
