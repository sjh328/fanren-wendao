# v20 经济审计报告（scripts/price-audit.mjs 自动生成）

采样画像：realm3、行情中位。

- 物品总数：146
- 定价为 0 的稀有物（无坊市渠道，按品阶折算黑市价）：pill_xisui(2阶)、m_qipei(2阶)、gf_wanjian(2阶)、gf_jianqich(2阶)、gf_tumo(3阶)、gf_dayan(3阶)、gf_bumie(3阶)、gf_zixiao(4阶)、gf_jianxin(5阶)、gf_hongmeng(5阶)、gf_feixian(3阶)、gf_lidu(4阶)、gf_taiyin(4阶)、gf_zhuixian(3阶)、gf_danjing(3阶)、gf_tianfu(3阶)、gf_banti(1阶)、gf_zhoutian(3阶)、gf_xuesha(3阶)、s_xt_jian(3阶)、s_xt_jia(3阶)、s_xt_pei(3阶)、s_cx_jian(3阶)、s_cx_pao(3阶)、s_cx_gou(3阶)、s_hj_sha(4阶)、s_hj_pao(4阶)、s_hj_ling(4阶)、s_xy_jian(5阶)、s_xy_ling(5阶)、s_xy_huan(5阶)、w_tianwen(4阶)、a_taiyi(4阶)、z_longyu(4阶)、z_hunpo(3阶)、z_taling(3阶)、gf_wangchen(4阶)、gf_hunyuan(4阶)、gf_niepan(5阶)、z_benming(5阶)、z_tianshu(2阶)、z_danxin(2阶)、z_cangjing(2阶)、w_lingjie(5阶)、a_xianpao(5阶)、z_xianyao(5阶)、gf_leishen(5阶)

## 问题清单（0）
- 无套利路径与定价倒挂。

## v34 扩容检测

- 拍卖池倒挂（0）：
  - 无。
- 黑市赌袋期望越界（0）：
  - 无。

## v35 扩容检测

- 宗门贡献汇率倒挂（0）：
  - 无。

## v37 扩容检测（E263/E266）

- 第四路·宗门兑丹「卖值/贡献」族内离散（锚 type==='pill' && price>0；pill_xisui price=0 卖值退化 1/200=0.005 无判别力排除出锚；离散 >3× 报警）：
  - 族内采样：pill_jiuzhuan:9.00、pill_dujie:8.00、pill_taichu:7.00、pill_zaohua:7.88、pill_dahuan:5.50、pill_yuanshen:8.63
- 第四路报警（0）：
  - 族内离散 ≤3×，无兑丹卖店档位塌陷。
- 第八路·购料环期望（坊市全价购料 vs 收集悬赏兜底 floor，>0 报警）：全境界全档材料期望 ≤0（floor 1.2×卖价 < 全价购价），环已破。
- 画符现金流越界（0，四季复扫）：
  - 无。
- 拍卖功法品阶倒挂（0）：
  - 无。

## v36 扩容检测

- 赌袋采样执行：28/28（四采样点全执行为验收线；满气运端已并入上方赌袋检测）
- 满气运端（luck23）EV 信息行：r0:75、r1:70、r2:-474、r3:-2709、r4:334、r5:3062、r6:7126（门禁线 0.6×成本；处方预期 ≤0 待数据侧后续校准，见 UPDATE_NOTES）
- 第七路·同表档位单调性（0）：
  - 丹药配方对/丹药档位/种子相邻档/符箓池全零。
- 第八路·per-action 现金流榜（采样 442 行，其中 v37 新增 68 行=悬赏·收集+宗门兑换，参与榜单与 300×eco 绝对线；中位基线钉死 v36 行集见源码注）：
  1. 塔绩·塔灵纳财(r9) —— 净 1,321,729 灵石/日
  2. 悬赏领赏(r9) —— 净 1,101,441 灵石/日
  3. 悬赏·收集(r9) —— 净 1,101,441 灵石/日
  4. 黑市价差(r9) —— 净 1,056,104 灵石/日
  5. 塔绩·塔灵纳财(r8) —— 净 347,823 灵石/日
  6. 悬赏领赏(r8) —— 净 289,853 灵石/日
  7. 悬赏·收集(r8) —— 净 289,853 灵石/日
  8. 黑市价差(r8) —— 净 277,922 灵石/日
  9. 塔绩·塔灵纳财(r7) —— 净 91,532 灵石/日
  10. 悬赏领赏(r7) —— 净 76,277 灵石/日
- 第八路·榜报警（0）：
  - 无越 300×eco 线或 Top1/中位 >8× 的离群动作。
