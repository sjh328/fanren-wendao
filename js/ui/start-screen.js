
/* ======================================================================
 * §17 游戏主控
 * ====================================================================== */
const StartScreen = {
  slot: 1,
  attrs: null,
  name: '',
  open(slot) {
    this.slot = slot;
    this.attrs = PlayerFactory.rollAttrs();
    const input = document.getElementById('create-name');
    input.value = Utils.pick(GameData.NAMES);
    document.getElementById('start-screen').querySelector('.start-inner').classList.add('hidden');
    document.getElementById('create-screen').classList.remove('hidden');
    UI.renderCreate();
  },
  back() {
    document.getElementById('create-screen').classList.add('hidden');
    document.getElementById('start-screen').querySelector('.start-inner').classList.remove('hidden');
  },
};
