import Controller from "@ember/controller";
import { SECOND_FACTOR_METHODS } from "discourse/models/user";
import I18n from "I18n";
import { ajax } from "discourse/lib/ajax";
import bootbox from "bootbox";
import { extractError } from "discourse/lib/ajax-error";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { alias, or, readOnly } from "@ember/object/computed";

export default Controller.extend({
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
});
