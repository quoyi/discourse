import DiscourseRoute from "discourse/routes/discourse";
import PreloadStore from "discourse/lib/preload-store";

export default DiscourseRoute.extend({
  model() {
    return PreloadStore.getAndRemove("user_2fa_settings");
  },
});
