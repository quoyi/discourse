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

  hasAlternatives: or(
    "isTotpAnAlternative",
    "isSecurityKeyAnAlternative",
    "isBackupCodesAnAlternative"
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

  @discourseComputed("shownSecondFactorMethod", "totpEnabled")
  isTotpAnAlternative(shownSecondFactorMethod, totpEnabled) {
    return (
      totpEnabled && shownSecondFactorMethod !== SECOND_FACTOR_METHODS.TOTP
    );
  },

  @discourseComputed("shownSecondFactorMethod", "securityKeysEnabled")
  isSecurityKeyAnAlternative(shownSecondFactorMethod, securityKeysEnabled) {
    return (
      securityKeysEnabled &&
      shownSecondFactorMethod !== SECOND_FACTOR_METHODS.SECURITY_KEY
    );
  },

  @discourseComputed("shownSecondFactorMethod", "backupCodesEnabled")
  isBackupCodesAnAlternative(shownSecondFactorMethod, backupCodesEnabled) {
    return (
      backupCodesEnabled &&
      shownSecondFactorMethod !== SECOND_FACTOR_METHODS.BACKUP_CODE
    );
  },

  @discourseComputed(
    "shownSecondFactorMethod",
    "securityKeysEnabled",
    "totpEnabled",
    "backupCodesEnabled"
  )
  alternativeSecondFactorMethods(
    shownSecondFactorMethod,
    securityKeysEnabled,
    totpEnabled,
    backupCodesEnabled
  ) {
    const alternatives = [];
    if (totpEnabled) {
      alternatives.push(SECOND_FACTOR_METHODS.TOTP);
    }
    if (securityKeysEnabled) {
      alternatives.push(SECOND_FACTOR_METHODS.SECOND_FACTOR_METHODS);
    }
    if (backupCodesEnabled) {
      alternatives.push(SECOND_FACTOR_METHODS.BACKUP_CODE);
    }
    return alternatives.filter((alt) => alt !== shownSecondFactorMethod);
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

  securityKeyRequired: alias("model.security_key_required"),
  backupEnabled: alias("model.backup_enabled"),
  otherMethodAllowed: readOnly("model.multiple_second_factor_methods"),

  securityKeyOrSecondFactorRequired: or(
    "model.second_factor_required",
    "model.security_key_required"
  ),

  @discourseComputed("model.security_key_required")
  secondFactorMethod(security_key_required) {
    return security_key_required
      ? SECOND_FACTOR_METHODS.SECURITY_KEY
      : SECOND_FACTOR_METHODS.TOTP;
  },

  @action
  useAnotherMethod(newMethod) {
    this.set("userSelectedMethod", newMethod);
  },

  @action
  submit() {
    ajax("/session/confirm-2fa", {
      type: "POST",
      data: {
        second_factor_token: "1",
      },
    });
  },

  @action
  authenticateSecurityKey() {
    getWebauthnCredential(
      this.model.challenge,
      this.model.allowed_credential_ids,
      (credentialData) => {
        this.set("securityKeyCredential", credentialData);
        this.send("submit");
      },
      (errorMessage) => {
        this.setProperties({
          securityKeyRequired: true,
          errorMessage,
        });
      }
    );
  },
});
