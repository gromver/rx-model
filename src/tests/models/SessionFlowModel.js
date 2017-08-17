import { Model } from '../..';

export default class SessionFlowModel extends Model {
  prepare(onCleanup) {
    const { fn } = this.getContext();

    fn && fn('prepare');

    onCleanup.subscribe(() => fn && fn('cleanup'));
  }
}