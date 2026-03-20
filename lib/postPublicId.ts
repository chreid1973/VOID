import { init } from "@paralleldrive/cuid2";

const createId = init({ length: 10 });

export function createPostPublicId() {
  return createId();
}
