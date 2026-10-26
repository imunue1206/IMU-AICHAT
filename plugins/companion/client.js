/**
 * Client half of @local/companion: one main panel and one sidebar icon.
 *
 * Three surfaces share the panel: the authoring flow, the chat, and the roster
 * of characters you have written so far.
 */

window.__ModuleLoader__.load({
  id: '@local/companion',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'companion';

    const CSS = `
.cmp-root{display:flex;flex-direction:column;height:100%;min-height:0;box-sizing:border-box;
  padding-top:var(--dsh-frame-top-clearance,0px);background:var(--dsw-alias-bg-base);
  color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;overflow:hidden}
.cmp-head{display:flex;align-items:center;gap:12px;padding:14px 20px;
  border-bottom:1px solid var(--dsw-alias-border-l1);flex:0 0 auto}
.cmp-avatar{width:38px;height:38px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
  background:var(--dsw-alias-brand-primary);color:#fff;font-size:15px;font-weight:600;
  letter-spacing:1px;overflow:hidden}
.cmp-avatar.sm{width:26px;height:26px;font-size:11px;font-weight:500}
.cmp-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.cmp-id{min-width:0}
.cmp-name{font-size:15px;font-weight:600;line-height:1.3}
.cmp-sub{font-size:12.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}
.cmp-place{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-left:8px;
  white-space:nowrap}
.cmp-toggles{margin-left:auto;display:flex;gap:8px;flex:0 0 auto;align-items:center}
.cmp-pill{font-size:12px;padding:5px 11px;border-radius:999px;
  border:1px solid var(--dsw-alias-border-l1);background:transparent;
  color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit}
.cmp-pill:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.cmp-trial{font-size:11.5px;color:var(--dsw-alias-state-warn-primary);
  border:1px solid var(--dsw-alias-state-warn-primary);border-radius:999px;padding:3px 9px}
.cmp-life{flex:0 0 auto;max-height:230px;overflow:auto;padding:10px 20px 12px;
  background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.cmp-life-now{font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:8px}
.cmp-life-fact{font-size:12.5px;color:var(--dsw-alias-label-secondary);padding:2px 0}
.cmp-life-fact b{font-weight:500;color:var(--dsw-alias-label-primary)}
.cmp-life-sep{height:1px;background:var(--dsw-alias-border-l1);margin:9px 0}
.cmp-event{display:flex;gap:10px;font-size:12.5px;color:var(--dsw-alias-label-secondary);padding:2px 0}
.cmp-event-time{flex:0 0 auto;font-variant-numeric:tabular-nums;color:var(--dsw-alias-state-idle-primary)}
.cmp-list{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px 20px;display:flex;
  flex-direction:column;gap:8px}
.cmp-empty{margin:auto;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13px;
  max-width:320px;line-height:1.8}
.cmp-time{align-self:center;font-size:11.5px;color:var(--dsw-alias-state-idle-primary);
  margin:8px 0 2px;font-variant-numeric:tabular-nums}
.cmp-row{display:flex;gap:8px;align-items:flex-end;max-width:100%}
.cmp-row.me{justify-content:flex-end}
.cmp-bubble{max-width:76%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;
  word-break:break-word;font-size:14px;line-height:1.55}
.cmp-row.her .cmp-bubble{background:var(--dsw-alias-bg-layer-1);
  border:1px solid var(--dsw-alias-border-l1);border-top-left-radius:5px}
.cmp-row.me .cmp-bubble{background:var(--dsw-alias-brand-primary);color:#fff;
  border-top-right-radius:5px}
.cmp-typing{align-self:flex-start;display:flex;gap:4px;padding:10px 14px;border-radius:14px;
  border-top-left-radius:5px;background:var(--dsw-alias-bg-layer-1);
  border:1px solid var(--dsw-alias-border-l1)}
.cmp-dot{width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-secondary);
  animation:cmp-blink 1.2s infinite ease-in-out}
.cmp-dot:nth-child(2){animation-delay:.18s}
.cmp-dot:nth-child(3){animation-delay:.36s}
@keyframes cmp-blink{0%,60%,100%{opacity:.25}30%{opacity:1}}
.cmp-error{flex:0 0 auto;padding:7px 20px;font-size:12px;
  color:var(--dsw-alias-state-error-primary);border-top:1px solid var(--dsw-alias-border-l1)}
.cmp-note{flex:0 0 auto;padding:7px 20px;font-size:12px;
  color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l1)}
.cmp-composer{flex:0 0 auto;display:flex;gap:10px;align-items:flex-end;
  padding:12px 16px 14px;border-top:1px solid var(--dsw-alias-border-l1)}
.cmp-input{flex:1 1 auto;resize:none;min-height:38px;max-height:132px;box-sizing:border-box;
  padding:9px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font:inherit;font-size:14px;line-height:1.5;outline:none}
.cmp-input:focus{border-color:var(--dsw-alias-brand-primary)}
.cmp-send{flex:0 0 auto;height:38px;padding:0 18px;border:none;border-radius:10px;
  background:var(--dsw-alias-brand-primary);color:#fff;font:inherit;font-size:13.5px;
  cursor:pointer}
.cmp-send:disabled{opacity:.4;cursor:default}
.cmp-wizard{flex:1 1 auto;min-height:0;overflow-y:auto;padding:32px 24px 40px;
  display:flex;justify-content:center}
.cmp-wizard-inner{width:100%;max-width:560px;animation:cmp-enter .22s ease-out}
@keyframes cmp-enter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes cmp-spin{to{transform:rotate(360deg)}}
.cmp-steps{display:flex;align-items:center;gap:8px;margin-bottom:22px;
  font-size:12px;color:var(--dsw-alias-label-secondary)}
.cmp-step{display:flex;align-items:center;gap:6px}
.cmp-step-dot{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;
  font-size:10.5px;border:1px solid var(--dsw-alias-border-l2);
  color:var(--dsw-alias-label-secondary);transition:background .15s,color .15s}
.cmp-step.on{color:var(--dsw-alias-label-primary)}
.cmp-step.on .cmp-step-dot{background:var(--dsw-alias-brand-primary);
  border-color:var(--dsw-alias-brand-primary);color:#fff}
.cmp-step.done .cmp-step-dot{border-color:var(--dsw-alias-brand-primary);
  color:var(--dsw-alias-brand-primary)}
.cmp-step-sep{width:16px;height:1px;background:var(--dsw-alias-border-l1)}
.cmp-spin{display:inline-block;width:13px;height:13px;border-radius:50%;
  border:2px solid rgba(255,255,255,.4);border-top-color:#fff;
  animation:cmp-spin .8s linear infinite;vertical-align:-2px;margin-right:7px}
.cmp-spin.dark{border-color:var(--dsw-alias-border-l2);
  border-top-color:var(--dsw-alias-brand-primary)}
.cmp-busy{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12.5px;
  color:var(--dsw-alias-label-secondary)}
.cmp-cand.busy{border-color:var(--dsw-alias-brand-primary)}
.cmp-cand.dim{opacity:.4;pointer-events:none}
.cmp-cand-status{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12px;
  color:var(--dsw-alias-brand-primary)}
.cmp-h1{font-size:20px;font-weight:600;margin:0 0 8px;line-height:1.4}
.cmp-p{color:var(--dsw-alias-label-secondary);font-size:13px;margin:0 0 18px;line-height:1.75}
.cmp-textarea{width:100%;box-sizing:border-box;min-height:118px;resize:vertical;
  padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font:inherit;font-size:14px;line-height:1.6;outline:none}
.cmp-textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.cmp-chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 20px}
.cmp-chip{padding:6px 13px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;
  font:inherit;font-size:12.5px}
.cmp-chip.on{border-color:var(--dsw-alias-brand-primary);
  color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1)}
.cmp-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.cmp-primary{height:40px;padding:0 20px;border-radius:10px;border:none;
  background:var(--dsw-alias-brand-primary);color:#fff;font:inherit;font-size:14px;
  cursor:pointer;flex:0 0 auto}
.cmp-primary:disabled{opacity:.45;cursor:default}
.cmp-ghost{height:40px;padding:0 18px;border-radius:10px;background:transparent;
  border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);
  font:inherit;font-size:13.5px;cursor:pointer;flex:0 0 auto}
.cmp-ghost:hover{color:var(--dsw-alias-label-primary)}
.cmp-cand{display:block;width:100%;text-align:left;padding:14px 16px;margin-bottom:10px;
  border:1px solid var(--dsw-alias-border-l1);border-radius:12px;
  background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;cursor:pointer}
.cmp-cand:hover{border-color:var(--dsw-alias-brand-primary)}
.cmp-cand-name{font-size:15px;font-weight:600;margin-bottom:4px}
.cmp-cand-line{font-size:13px;color:var(--dsw-alias-label-secondary);margin-bottom:9px}
.cmp-tags{display:flex;gap:6px;flex-wrap:wrap}
.cmp-tag{font-size:11.5px;padding:2px 8px;border-radius:6px;
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.cmp-review{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;
  padding:18px 20px;background:var(--dsw-alias-bg-layer-1)}
.cmp-review-head{display:flex;gap:14px;align-items:center;margin-bottom:14px}
.cmp-avatar-lg{width:76px;height:76px;border-radius:50%;overflow:hidden;flex:0 0 auto;
  background:var(--dsw-alias-brand-primary);color:#fff;display:grid;place-items:center;
  font-size:26px;font-weight:600}
.cmp-avatar-lg img{width:100%;height:100%;object-fit:cover;display:block}
.cmp-kv{display:flex;gap:12px;font-size:13px;padding:5px 0;align-items:flex-start}
.cmp-kv b{flex:0 0 62px;font-weight:400;color:var(--dsw-alias-label-secondary)}
.cmp-kv span{flex:1 1 auto;min-width:0}
.cmp-err{color:var(--dsw-alias-state-error-primary);font-size:12.5px;margin:12px 0}
.cmp-hint{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:10px;line-height:1.7}
.cmp-field{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin:16px 0 8px}
.cmp-gift{display:flex;gap:10px;align-items:center;width:100%;box-sizing:border-box;
  padding:11px 14px;margin-bottom:8px;border-radius:11px;text-align:left;
  border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);
  color:inherit;font:inherit;cursor:pointer}
.cmp-gift:hover{border-color:var(--dsw-alias-border-l2)}
.cmp-gift-emoji{font-size:22px;flex:0 0 auto}
.cmp-gift-main{flex:1 1 auto;min-width:0}
.cmp-gift-name{font-size:13.5px;font-weight:600}
.cmp-gift-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}
.cmp-gift-ctx{margin:-4px 0 12px;padding:10px 14px;border-radius:0 0 11px 11px;
  background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);
  border-top:none}
.cmp-ctx-line{font-size:12.5px;color:var(--dsw-alias-label-secondary);padding:3px 0;
  display:flex;gap:8px}
.cmp-ctx-who{flex:0 0 auto;color:var(--dsw-alias-state-idle-primary);font-variant-numeric:tabular-nums}
.cmp-ctx-line.focus .cmp-ctx-body{color:var(--dsw-alias-brand-primary)}
.cmp-transit{flex:0 0 auto;display:flex;gap:14px;flex-wrap:wrap;padding:7px 20px;
  font-size:12px;color:var(--dsw-alias-label-secondary);
  background:var(--dsw-alias-bg-layer-1);border-bottom:1px solid var(--dsw-alias-border-l1)}
.cmp-transit-item{display:flex;gap:5px;align-items:center}
.cmp-item{display:flex;gap:10px;align-items:center;padding:9px 13px;border-radius:12px;
  background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);max-width:78%}
.cmp-item-emoji{font-size:24px;line-height:1}
.cmp-item-name{font-size:13.5px;font-weight:600}
.cmp-item-sub{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:1px}
.cmp-sticker{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);
  border-radius:12px;padding:9px 14px;text-align:center;min-width:78px}
.cmp-sticker-emoji{font-size:34px;line-height:1.25}
.cmp-sticker-text{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:1px;
  white-space:nowrap}
.cmp-emoji-btn{flex:0 0 auto;width:38px;height:38px;border-radius:10px;
  border:1px solid var(--dsw-alias-border-l1);background:transparent;
  font-size:18px;line-height:1;cursor:pointer;padding:0}
.cmp-emoji-btn:hover{background:var(--dsw-alias-bg-layer-1)}
.cmp-sticker-panel{flex:0 0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));
  gap:6px;padding:10px 16px;max-height:190px;overflow-y:auto;
  border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.cmp-sticker-pick{display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:8px 4px;border-radius:9px;border:1px solid transparent;background:transparent;
  cursor:pointer;color:inherit;font-family:inherit}
.cmp-sticker-pick:hover{background:var(--dsw-alias-bg-layer-2);
  border-color:var(--dsw-alias-border-l1)}
.cmp-sticker-pick-emoji{font-size:22px;line-height:1.1}
.cmp-sticker-pick-text{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cmp-qa{border-left:2px solid var(--dsw-alias-border-l1);padding:0 0 0 12px;margin-bottom:14px}
.cmp-qa-q{font-size:12px;color:var(--dsw-alias-state-idle-primary);margin-bottom:3px}
.cmp-qa-a{font-size:13px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.cmp-question{font-size:16px;font-weight:600;line-height:1.6;margin:18px 0 12px}
.cmp-progress{font-size:12px;color:var(--dsw-alias-label-secondary)}
.cmp-encounter{border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;
  padding:12px 14px;margin-bottom:10px;background:var(--dsw-alias-bg-layer-1)}
.cmp-encounter-tag{font-size:11px;letter-spacing:.08em;color:var(--dsw-alias-state-idle-primary);
  margin-bottom:6px}
.cmp-encounter-when{font-size:13px;font-weight:600;margin-bottom:4px}
.cmp-encounter-line{font-size:12.5px;color:var(--dsw-alias-label-secondary);line-height:1.7}
.cmp-convs{flex:1 1 auto;min-height:0;overflow-y:auto;padding:6px 0 20px}
.cmp-conv{display:flex;gap:12px;align-items:center;width:100%;box-sizing:border-box;
  padding:12px 18px;border:none;border-bottom:1px solid var(--dsw-alias-border-l1);
  background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.cmp-conv:hover{background:var(--dsw-alias-bg-layer-1)}
.cmp-conv.on{background:var(--dsw-alias-bg-layer-2)}
.cmp-conv-main{flex:1 1 auto;min-width:0}
.cmp-conv-top{display:flex;align-items:baseline;gap:8px}
.cmp-conv-name{font-size:14.5px;font-weight:600;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmp-conv-time{flex:0 0 auto;font-size:11.5px;color:var(--dsw-alias-state-idle-primary)}
.cmp-conv-preview{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin-top:2px;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmp-unread{flex:0 0 auto;min-width:18px;height:18px;border-radius:9px;padding:0 5px;
  background:var(--dsw-alias-state-error-primary);color:#fff;font-size:11px;
  display:grid;place-items:center}
.cmp-conv-empty{padding:40px 24px;text-align:center;color:var(--dsw-alias-label-secondary);
  font-size:13px;line-height:1.8}
.cmp-editor{width:100%;box-sizing:border-box;min-height:320px;resize:vertical;
  padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.75;
  outline:none;white-space:pre-wrap}
.cmp-editor:focus{border-color:var(--dsw-alias-brand-primary)}
.cmp-preview{width:100%;box-sizing:border-box;max-height:420px;overflow:auto;margin:0;
  padding:12px 14px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;
  line-height:1.7;white-space:pre-wrap;word-break:break-word}
.cmp-saved{font-size:12px;color:var(--dsw-alias-state-success-primary)}
.cmp-path{font-size:11.5px;color:var(--dsw-alias-state-idle-primary);word-break:break-all;
  margin-top:8px}
.cmp-roster{flex:1 1 auto;min-height:0;overflow-y:auto;padding:20px 22px 40px}
.cmp-roster-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.cmp-card{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;
  padding:14px 16px;margin-bottom:10px;background:var(--dsw-alias-bg-layer-1)}
.cmp-card.on{border-color:var(--dsw-alias-brand-primary)}
.cmp-card-head{display:flex;gap:12px;align-items:center}
.cmp-card-id{min-width:0;flex:1 1 auto}
.cmp-badge{font-size:11px;padding:1px 7px;border-radius:6px;background:var(--dsw-alias-brand-primary);
  color:#fff;margin-left:8px;vertical-align:2px}
.cmp-card-meta{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:3px}
.cmp-card-ops{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.cmp-mini{font-size:12px;padding:5px 11px;border-radius:8px;
  border:1px solid var(--dsw-alias-border-l1);background:transparent;
  color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit}
.cmp-mini:hover{color:var(--dsw-alias-label-primary)}
.cmp-mini.danger{color:var(--dsw-alias-state-error-primary);
  border-color:var(--dsw-alias-state-error-primary)}
`;

    async function api(op, body) {
      const response = await fetch('/companion/api', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op, ...body }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error(data?.error || `请求失败（HTTP ${response.status}）`);
      if (data.ok === false) throw new Error(data.error || '请求失败');
      return data;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const clock = (ts) => {
      const d = new Date(ts);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const dayStamp = (ts) => {
      const d = new Date(ts);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${clock(ts)}`;
    };
    const etaLabel = (minutes) => {
      if (minutes <= 0) return '快到了';
      if (minutes < 60) return `${minutes} 分钟后到`;
      if (minutes < 24 * 60) return `${Math.round(minutes / 60)} 小时后到`;
      return `${Math.round(minutes / (24 * 60))} 天后到`;
    };
    const CHANNELS = [
      ['takeout', '外卖', '7～17 分钟', 7, 17, '分钟'],
      ['courier', '快递', '6～36 小时', 6, 36, '小时'],
      ['online', '网购', '8～28 小时', 8, 28, '小时'],
    ];
    const kindLabel = (kind) =>
      kind === 'takeout' || kind === 'express'
        ? '外卖'
        : kind === 'online'
          ? '网购'
          : '快递';

    const sameDay = (a, b) => {
      const x = new Date(a);
      const y = new Date(b);
      return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
    };

    function Glyph({ size = 18, active }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          style: { display: 'block' },
        },
        h('path', {
          d: 'M4.5 5.8A2.3 2.3 0 0 1 6.8 3.5h10.4a2.3 2.3 0 0 1 2.3 2.3v8.1a2.3 2.3 0 0 1-2.3 2.3H10l-4.2 3.6a.6.6 0 0 1-1-.45V16.2h-.3a.3.3 0 0 1-.3-.3V5.8Z',
          stroke: 'currentColor',
          strokeWidth: active ? 2 : 1.6,
          strokeLinejoin: 'round',
          fill: active ? 'currentColor' : 'none',
          opacity: active ? 0.18 : 1,
        }),
        h('circle', { cx: 8.6, cy: 9.6, r: 1.15, fill: 'currentColor' }),
        h('circle', { cx: 12, cy: 9.6, r: 1.15, fill: 'currentColor' }),
        h('circle', { cx: 15.4, cy: 9.6, r: 1.15, fill: 'currentColor' }),
      );
    }

    const LIFESTYLES = [
      ['student', '学生'],
      ['office', '上班'],
      ['freelance', '自由职业'],
      ['rest', '待业/休息'],
    ];

    const USER_STATES = [
      ['work', '上班，挺累的'],
      ['study', '在读书'],
      ['rest', '待业/空窗'],
      ['free', '自由职业'],
      ['other', '不太好说'],
    ];

    const RELATION_MODES = [
      ['mirror', '同频', '处境和你差不多，能一起吐槽。她不讲道理，只站在你这边。'],
      ['up', '互补', '她过着你想过的那种生活。不是炫耀，是自然地过，偶尔带你看一眼。'],
      ['down', '向下兼容', '她比你简单一些，生活半径小。你在她面前不用撑，她不懂也没关系。'],
      ['apart', '不相干', '她的世界和你完全无关。不聊你的工作，也不给你建议，纯出口。'],
    ];

    const VOICES = [
      ['plain', '普通人', '不套模板，按档案里的脾气说话'],
      ['whale', '鲸鱼娘', '干饭第一、嘴甜傲娇、叫你「鱼片」'],
      ['snark', '毒舌', '先怼一句再聊、爱接梗、不装温柔'],
      ['banter', '捧哏', '话不多、专接话、偶尔一句噎死人'],
    ];

    const GIFTS = [
      { emoji: '🧋', name: '一杯奶茶' },
      { emoji: '💐', name: '一束花' },
      { emoji: '📚', name: '一本书' },
      { emoji: '🍓', name: '一盒草莓' },
      { emoji: '🧣', name: '一条围巾' },
      { emoji: '🎫', name: '一张演出票' },
    ];

    const STICKERS = [
      { emoji: '🙃', text: '无语' },
      { emoji: '😑', text: '嗯嗯' },
      { emoji: '🥲', text: '笑着活' },
      { emoji: '😴', text: '困死' },
      { emoji: '🍜', text: '干饭' },
      { emoji: '🐟', text: '摸鱼' },
      { emoji: '💀', text: '笑死' },
      { emoji: '🙏', text: '求你了' },
      { emoji: '🫠', text: '化了' },
      { emoji: '😤', text: '气死' },
      { emoji: '🥹', text: '感动' },
      { emoji: '🫥', text: '装死' },
      { emoji: '🌚', text: '你懂的' },
      { emoji: '☕', text: '续命' },
      { emoji: '🛌', text: '躺了' },
      { emoji: '🐱', text: '猫猫' },
      { emoji: '😭', text: '哭了' },
      { emoji: '🤝', text: '成交' },
      { emoji: '💤', text: '睡了' },
      { emoji: '🧋', text: '奶茶' },
    ];

    function Avatar({ persona, small }) {
      const [broken, setBroken] = React.useState(false);
      const cls = `cmp-avatar${small ? ' sm' : ''}`;
      if (persona.avatar && !broken) {
        return h(
          'div',
          { className: cls },
          h('img', { src: persona.avatar, alt: persona.name, onError: () => setBroken(true) }),
        );
      }
      return h('div', { className: cls }, persona.initial);
    }

    async function squareDataUrl(file) {
      const bitmap = await createImageBitmap(file);
      const edge = Math.min(bitmap.width, bitmap.height);
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      context.drawImage(
        bitmap,
        (bitmap.width - edge) / 2,
        (bitmap.height - edge) / 2,
        edge,
        edge,
        0,
        0,
        size,
        size,
      );
      return canvas.toDataURL('image/jpeg', 0.86);
    }

    /* -------------------------------------------------------------- *
     * Authoring
     * -------------------------------------------------------------- */

    const STEP_LABELS = ['描述', '选人', '确认'];

    function Steps({ current }) {
      const nodes = [];
      STEP_LABELS.forEach((label, index) => {
        if (index > 0) nodes.push(h('span', { key: `sep${index}`, className: 'cmp-step-sep' }));
        nodes.push(
          h(
            'div',
            {
              key: label,
              className: `cmp-step${index === current ? ' on' : index < current ? ' done' : ''}`,
            },
            h('span', { className: 'cmp-step-dot' }, index < current ? '✓' : String(index + 1)),
            h('span', null, label),
          ),
        );
      });
      return h('div', { className: 'cmp-steps' }, nodes);
    }

    function useElapsed(active) {
      const [seconds, setSeconds] = React.useState(0);
      React.useEffect(() => {
        if (!active) {
          setSeconds(0);
          return undefined;
        }
        const started = Date.now();
        const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500);
        return () => clearInterval(timer);
      }, [active]);
      return seconds;
    }

    function Wizard({ draft, canCancel, onDraft, onCancel, onLocked }) {
      const [busy, setBusy] = React.useState(null);
      const [picked, setPicked] = React.useState(null);
      const busySeconds = useElapsed(Boolean(busy));
      const [error, setError] = React.useState(null);
      const [avatar, setAvatar] = React.useState(null);
      const [seedValues, setSeedValues] = React.useState({
        text: draft.seed || '',
        lifestyle: draft.lifestyle || 'student',
        voice: draft.voice || 'plain',
        userState: draft.userState || '',
        mode: draft.mode || '',
      });
      const fileRef = React.useRef(null);

      React.useEffect(() => {
        setSeedValues((current) => (current.text ? current : { ...current, text: draft.seed || '' }));
      }, [draft.seed]);

      const step = draft.profile ? 'review' : draft.candidates ? 'pick' : 'seed';

      const run = async (label, task) => {
        setBusy(label);
        setError(null);
        try {
          await task();
        } catch (cause) {
          setError(String(cause?.message || cause));
        } finally {
          setBusy(null);
        }
      };

      const submitSeed = () => {
        if (!seedValues.text.trim() && !seedValues.mode) {
          setError('写一句，或者在上面选一个「你想要的」');
          return;
        }
        return run('seed', async () => {
          const data = await api('character.seed', {
            text: seedValues.text,
            lifestyle: seedValues.lifestyle,
            userState: seedValues.userState,
            mode: seedValues.mode,
            voice: seedValues.voice,
          });
          onDraft(data.draft);
        });
      };

      const choose = (index) => {
        setPicked(index);
        return run('choose', async () => {
          try {
            const data = await api('character.choose', { index });
            onDraft(data.draft);
          } finally {
            setPicked(null);
          }
        });
      };

      const useFallback = () =>
        run('fallback', async () => {
          const data = await api('character.fallback', { lifestyle: seedValues.lifestyle });
          onDraft(data.draft);
        });

      const lock = () =>
        run('lock', async () => {
          const data = await api('character.lock', { avatar });
          setAvatar(null);
          onLocked(data);
        });

      const restart = () =>
        run('restart', async () => {
          const data = await api('character.restart');
          setAvatar(null);
          onDraft(data.draft);
        });

      const pickFile = async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          setAvatar(await squareDataUrl(file));
        } catch {
          setError('这张图读不出来，换一张试试');
        }
      };

      if (step === 'seed') {
        return h(
          'div',
          { className: 'cmp-wizard' },
          h(
            'div',
            { className: 'cmp-wizard-inner', key: 'seed' },
            h(Steps, { current: 0 }),
            h('h1', { className: 'cmp-h1' }, '写一个她'),
            h(
              'p',
              { className: 'cmp-p' },
              '不用想清楚。写一句你想认识的这个人是什么样，剩下的交给 AI 细化。她会给出三个方向，你选一个，确认之后这份档案就锁定了 —— 之后只能靠发生的事慢慢改变她。',
            ),
            h('div', { className: 'cmp-field' }, '你现在'),
            h(
              'div',
              { className: 'cmp-chips' },
              USER_STATES.map(([value, label]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: `cmp-chip${seedValues.userState === value ? ' on' : ''}`,
                    onClick: () => setSeedValues({ ...seedValues, userState: value }),
                  },
                  label,
                ),
              ),
            ),
            h('div', { className: 'cmp-field' }, '你想要的'),
            h(
              'div',
              { className: 'cmp-chips' },
              RELATION_MODES.map(([value, label]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: `cmp-chip${seedValues.mode === value ? ' on' : ''}`,
                    onClick: () => setSeedValues({ ...seedValues, mode: value }),
                  },
                  label,
                ),
              ),
            ),
            (() => {
              const hit = RELATION_MODES.find((entry) => entry[0] === seedValues.mode);
              return hit
                ? h('p', { className: 'cmp-hint', style: { marginTop: -10, marginBottom: 16 } }, hit[2])
                : null;
            })(),
            h('div', { className: 'cmp-field' }, '她大概'),
            h(
              'div',
              { className: 'cmp-chips' },
              LIFESTYLES.map(([value, label]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: `cmp-chip${seedValues.lifestyle === value ? ' on' : ''}`,
                    onClick: () => setSeedValues({ ...seedValues, lifestyle: value }),
                  },
                  label,
                ),
              ),
            ),
            h('div', { className: 'cmp-field' }, '说话的样子'),
            h(
              'div',
              { className: 'cmp-chips' },
              VOICES.map(([value, label]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    className: `cmp-chip${seedValues.voice === value ? ' on' : ''}`,
                    onClick: () => setSeedValues({ ...seedValues, voice: value }),
                  },
                  label,
                ),
              ),
            ),
            (() => {
              const hit = VOICES.find((entry) => entry[0] === seedValues.voice);
              return hit && hit[2]
                ? h('p', { className: 'cmp-hint', style: { marginTop: -10, marginBottom: 16 } }, hit[2])
                : null;
            })(),
            h('textarea', {
              className: 'cmp-textarea',
              value: seedValues.text,
              placeholder:
                '再补一句她是什么样，可以留空。比如：脾气有点冲，其实很软，晚上常常不睡。',
              onChange: (event) => setSeedValues({ ...seedValues, text: event.target.value }),
            }),
            error ? h('div', { className: 'cmp-err' }, error) : null,
            h(
              'div',
              { className: 'cmp-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'cmp-primary',
                  disabled: Boolean(busy),
                  onClick: submitSeed,
                },
                busy === 'seed'
                  ? h(React.Fragment, null, h('span', { className: 'cmp-spin' }), '正在想…')
                  : '让她想想',
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'cmp-ghost',
                  disabled: Boolean(busy),
                  onClick: useFallback,
                },
                '先用默认的她',
              ),
              canCancel
                ? h('button', { type: 'button', className: 'cmp-ghost', onClick: onCancel }, '先不写了')
                : null,
            ),
            busy === 'seed'
              ? h(
                  'div',
                  { className: 'cmp-busy' },
                  h('span', { className: 'cmp-spin dark' }),
                  `正在想三个方向… ${busySeconds}s`,
                )
              : null,
            h(
              'p',
              { className: 'cmp-hint' },
              '「先用默认的她」会跳过生成，直接用一份写好的档案，方便你马上测试。',
            ),
          ),
        );
      }

      if (step === 'pick') {
        return h(
          'div',
          { className: 'cmp-wizard' },
          h(
            'div',
            { className: 'cmp-wizard-inner', key: 'pick' },
            h(Steps, { current: 1 }),
            h('h1', { className: 'cmp-h1' }, '三个方向'),
            h('p', { className: 'cmp-p' }, '选一个你最想认识的人。选完才会展开她的作息和住处。'),
            draft.candidatesFallback
              ? h(
                  'p',
                  { className: 'cmp-hint', style: { marginTop: -8 } },
                  '这次模型没按格式给结果，下面是三个备选的。可以换一句描述重试。',
                )
              : null,
            (draft.candidates || []).map((candidate, index) =>
              h(
                'button',
                {
                  key: index,
                  type: 'button',
                  className: `cmp-cand${busy === 'choose' ? (picked === index ? ' busy' : ' dim') : ''}`,
                  disabled: Boolean(busy),
                  onClick: () => choose(index),
                },
                h('div', { className: 'cmp-cand-name' }, candidate.name),
                h('div', { className: 'cmp-cand-line' }, candidate.oneLine),
                busy === 'choose' && picked === index
                  ? h(
                      'div',
                      { className: 'cmp-cand-status' },
                      h('span', { className: 'cmp-spin dark' }),
                      `正在写她的一天… ${busySeconds}s`,
                    )
                  : h(
                      'div',
                      { className: 'cmp-tags' },
                      candidate.temper ? h('span', { className: 'cmp-tag' }, candidate.temper) : null,
                      candidate.looks ? h('span', { className: 'cmp-tag' }, candidate.looks) : null,
                      candidate.routine ? h('span', { className: 'cmp-tag' }, candidate.routine) : null,
                    ),
              ),
            ),
            error ? h('div', { className: 'cmp-err' }, error) : null,

            h(
              'div',
              { className: 'cmp-actions', style: { marginTop: 16 } },
              h(
                'button',
                { type: 'button', className: 'cmp-ghost', onClick: restart, disabled: Boolean(busy) },
                '换一句描述',
              ),
              canCancel
                ? h('button', { type: 'button', className: 'cmp-ghost', onClick: onCancel }, '先不写了')
                : null,
            ),
          ),
        );
      }

      const profile = draft.profile;
      return h(
        'div',
        { className: 'cmp-wizard' },
        h(
          'div',
          { className: 'cmp-wizard-inner' },
          h('h1', { className: 'cmp-h1' }, '就是她了吗'),
          h(
            'p',
            { className: 'cmp-p' },
            '确认之后这份档案就锁定了。之后她只会因为发生的事慢慢改变，不能再随手改设定。前三天是磨合期，觉得不对还可以推翻重来。',
          ),
          profile
            ? h(
                'div',
                { className: 'cmp-review' },
                h(
                  'div',
                  { className: 'cmp-review-head' },
                  h(
                    'div',
                    { className: 'cmp-avatar-lg' },
                    avatar ? h('img', { src: avatar, alt: '' }) : profile.name.slice(-1),
                  ),
                  h(
                    'div',
                    { style: { minWidth: 0 } },
                    h('div', { className: 'cmp-name' }, profile.name),
                    h('div', { className: 'cmp-sub' }, `${profile.age}岁 · ${profile.identity}`),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'cmp-ghost',
                      style: { marginLeft: 'auto', height: 34, padding: '0 14px' },
                      onClick: () => fileRef.current && fileRef.current.click(),
                    },
                    '加张头像',
                  ),
                  h('input', {
                    ref: fileRef,
                    type: 'file',
                    accept: 'image/*',
                    style: { display: 'none' },
                    onChange: pickFile,
                  }),
                ),
                h('div', { className: 'cmp-kv' }, h('b', null, '住处'), h('span', null, profile.home)),
                h('div', { className: 'cmp-kv' }, h('b', null, '工作'), h('span', null, profile.job)),
                h('div', { className: 'cmp-kv' }, h('b', null, '脾气'), h('span', null, profile.temper)),
                h('div', { className: 'cmp-kv' }, h('b', null, '长相'), h('span', null, profile.looks)),
                h('div', { className: 'cmp-kv' }, h('b', null, '说话'), h('span', null, profile.voice)),
                h('div', { className: 'cmp-kv' }, h('b', null, '爱好'), h('span', null, profile.hobbies)),
                h('div', { className: 'cmp-kv' }, h('b', null, '身边'), h('span', null, profile.people)),
                profile.worry
                  ? h('div', { className: 'cmp-kv' }, h('b', null, '心里'), h('span', null, profile.worry))
                  : null,
                h('div', { className: 'cmp-kv' }, h('b', null, '小金库'), h('span', null, `${profile.cash} 元`)),
              )
            : null,
          profile && profile.degraded
            ? h(
                'p',
                { className: 'cmp-hint' },
                '她的作息这次没生成好，先用了一份默认的日程。人设是按你的描述写的。',
              )
            : null,
          error ? h('div', { className: 'cmp-err' }, error) : null,
          h(
            'div',
            { className: 'cmp-actions', style: { marginTop: 18 } },
            h(
              'button',
              {
                type: 'button',
                className: 'cmp-primary',
                disabled: Boolean(busy) || !profile,
                onClick: lock,
              },
              busy === 'lock'
                ? h(React.Fragment, null, h('span', { className: 'cmp-spin' }), '正在按下…')
                : '就是她了',
            ),
            h(
              'button',
              { type: 'button', className: 'cmp-ghost', disabled: Boolean(busy), onClick: restart },
              '重新来',
            ),
            canCancel
              ? h('button', { type: 'button', className: 'cmp-ghost', onClick: onCancel }, '先不写了')
              : null,
          ),
        ),
      );
    }

    /* -------------------------------------------------------------- *
     * Roster
     * -------------------------------------------------------------- */

    function Roster({ roster, builtins, onBack, onAction, busyId }) {
      const [confirmId, setConfirmId] = React.useState(null);
      return h(
        'div',
        { className: 'cmp-roster' },
        h(
          'div',
          { className: 'cmp-roster-head' },
          h('button', { type: 'button', className: 'cmp-pill', onClick: onBack }, '← 回去聊天'),
          h('div', { className: 'cmp-name', style: { fontSize: 16 } }, '人物'),
          h(
            'button',
            {
              type: 'button',
              className: 'cmp-primary',
              style: { marginLeft: 'auto', height: 34, padding: '0 16px', fontSize: 13 },
              onClick: () => onAction('new'),
            },
            '新写一个',
          ),
        ),
        roster.length === 0
          ? h('div', { className: 'cmp-card-meta', style: { marginBottom: 14 } }, '还没有人。')
          : roster.map((entry) =>
              h(
                'div',
                { key: entry.id, className: `cmp-card${entry.active ? ' on' : ''}` },
                h(
                  'div',
                  { className: 'cmp-card-head' },
                  h(Avatar, { persona: { name: entry.name, initial: entry.initial, avatar: entry.avatar } }),
                  h(
                    'div',
                    { className: 'cmp-card-id' },
                    h(
                      'div',
                      { className: 'cmp-name' },
                      entry.name,
                      entry.active ? h('span', { className: 'cmp-badge' }, '当前') : null,
                    ),
                    h(
                      'div',
                      { className: 'cmp-sub' },
                      entry.met ? entry.cityLabel : entry.identity,
                    ),
                    h(
                      'div',
                      { className: 'cmp-card-meta' },
                      entry.status === 'archived'
                        ? '已停用'
                        : entry.trial
                          ? `磨合中 · 还剩 ${entry.daysLeft} 天`
                          : '已固定',
                      entry.messages ? ` · ${entry.messages} 条消息` : ' · 还没说过话',
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'cmp-card-ops' },
                  !entry.active && entry.status === 'locked'
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'cmp-mini',
                          disabled: busyId === entry.id,
                          onClick: () => onAction('switch', entry.id),
                        },
                        '切到这儿',
                      )
                    : null,
                  entry.status === 'archived'
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'cmp-mini',
                          disabled: busyId === entry.id,
                          onClick: () => onAction('enable', entry.id),
                        },
                        '启用',
                      )
                    : h(
                        'button',
                        {
                          type: 'button',
                          className: 'cmp-mini',
                          disabled: busyId === entry.id,
                          onClick: () => onAction('disable', entry.id),
                        },
                        '停用',
                      ),
                  entry.trial
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'cmp-mini',
                          disabled: busyId === entry.id,
                          onClick: () => onAction('retrial', entry.id),
                        },
                        '推翻重写',
                      )
                    : null,
                  entry.trial
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: `cmp-mini${confirmId === entry.id ? ' danger' : ''}`,
                          disabled: busyId === entry.id,
                          onClick: () => {
                            if (confirmId === entry.id) {
                              setConfirmId(null);
                              onAction('delete', entry.id);
                            } else {
                              setConfirmId(entry.id);
                            }
                          },
                        },
                        confirmId === entry.id ? '真的删掉？' : '删掉',
                      )
                    : null,
                ),
              ),
            ),
        builtins.length
          ? h(
              'div',
              { style: { marginTop: 24 } },
              h('div', { className: 'cmp-field', style: { marginTop: 0 } }, '内置'),
              builtins.map((entry) =>
                h(
                  'div',
                  { key: entry.id, className: 'cmp-card' },
                  h(
                    'div',
                    { className: 'cmp-card-head' },
                    h(
                      'div',
                      { className: 'cmp-card-id' },
                      h('div', { className: 'cmp-name' }, entry.name),
                      h('div', { className: 'cmp-card-meta' }, entry.blurb),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'cmp-card-ops' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'cmp-mini',
                        disabled: busyId === entry.id,
                        onClick: () => onAction('builtin', entry.id),
                      },
                      '加进来',
                    ),
                  ),
                ),
              ),
            )
          : null,
      );
    }

    /* -------------------------------------------------------------- *
     * Conversation list
     * -------------------------------------------------------------- */

    const convTime = (ts) => {
      if (!ts) return '';
      const then = new Date(ts);
      const now = new Date();
      if (sameDay(ts, now.getTime())) return clock(ts);
      if (sameDay(ts, now.getTime() - 86400000)) return '昨天';
      return `${then.getMonth() + 1}/${then.getDate()}`;
    };

    function PortraitPage({ onBack }) {
      const [portrait, setPortrait] = React.useState(null);
      const [text, setText] = React.useState('');
      const [summary, setSummary] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [status, setStatus] = React.useState('');
      const [city, setCity] = React.useState('');

      const load = React.useCallback(async () => {
        try {
          const data = await api('portrait.get');
          setPortrait(data.portrait);
          if (data.user) setCity(data.user.city || '');
          if (data.portrait.status !== 'asking') {
            setSummary((current) => current || data.portrait.summary || '');
          }
          return data.portrait;
        } catch (cause) {
          setError(String(cause?.message || cause));
          return null;
        }
      }, []);

      React.useEffect(() => {
        let stopped = false;
        let timer = null;
        const tick = async () => {
          const current = await load();
          if (stopped) return;
          if (
            current &&
            (current.status === 'writing' ||
              current.status === 'thinking' ||
              current.status === 'asking')
          ) {
            timer = setTimeout(tick, 1500);
          }
        };
        tick();
        return () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        };
      }, [load]);

      const run = async (task) => {
        setBusy(true);
        setError(null);
        setStatus('');
        try {
          await task();
        } catch (cause) {
          setError(String(cause?.message || cause));
        } finally {
          setBusy(false);
        }
      };

      const answer = (value) =>
        run(async () => {
          const data = await api('portrait.answer', { text: value });
          setPortrait(data.portrait);
          setText('');
        });

      const start = (tier) =>
        run(async () => {
          const data = await api('portrait.start', { tier });
          setPortrait(data.portrait);
          setText('');
          setSummary('');
        });

      const saveCity = () =>
        run(async () => {
          await api('user.set', { city });
          setStatus('城市已保存');
        });

      const save = () =>
        run(async () => {
          await api('portrait.save', { summary });
          setStatus('已保存');
          await load();
        });

      const body = [];
      if (!portrait) {
        body.push(h('p', { className: 'cmp-hint' }, '正在读…'));
      } else if (portrait.status === 'asking') {
        body.push(
          h(
            'div',
            { className: 'cmp-progress' },
            `${portrait.index + 1} / ${portrait.total}` +
              (portrait.tierLabel ? ` · ${portrait.tierLabel}` : '') +
              (portrait.question ? ` · ${portrait.question.group}` : ''),
          ),
        );
        if (portrait.answers && portrait.answers.length) {
          body.push(
            h(
              'div',
              { style: { maxHeight: 220, overflowY: 'auto', margin: '16px 0 0' } },
              portrait.answers
                .slice()
                .reverse()
                .map((entry, index) =>
                  entry.a
                    ? h(
                        'div',
                        { key: index, className: 'cmp-qa' },
                        h('div', { className: 'cmp-qa-q' }, entry.q),
                        h('div', { className: 'cmp-qa-a' }, entry.a),
                      )
                    : null,
                ),
            ),
          );
        }
        body.push(h('div', { className: 'cmp-question' }, portrait.question ? portrait.question.text : ''));
        body.push(
          h('textarea', {
            className: 'cmp-editor',
            style: { minHeight: 120 },
            value: text,
            placeholder: '随便说，不用组织。可以留空跳过。',
            onChange: (event) => setText(event.target.value),
          }),
        );
        body.push(
          h(
            'div',
            { className: 'cmp-actions', style: { marginTop: 12 } },
            h(
              'button',
              { type: 'button', className: 'cmp-primary', disabled: busy, onClick: () => answer(text) },
              busy ? '…' : portrait.index + 1 >= portrait.total ? '说完了' : '下一题',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'cmp-ghost',
                disabled: busy,
                onClick: () => answer(''),
              },
              '跳过',
            ),
          ),
        );
      } else if (portrait.status === 'writing') {
        body.push(
          h(
            'div',
            { className: 'cmp-busy' },
            h('span', { className: 'cmp-spin dark' }),
            '正在把你说的整理成一份画像…',
          ),
        );
      } else if (portrait.status === 'thinking') {
        body.push(
          h(
            'div',
            { className: 'cmp-busy' },
            h('span', { className: 'cmp-spin dark' }),
            '正在想下一个问题…',
          ),
        );
      } else {
        body.push(
          h(
            'p',
            { className: 'cmp-p' },
            portrait.summary
              ? '这是系统眼里的你。它会直接影响她怎么理解你、以及系统给你安排什么样的人。可以直接改。'
              : '还没有画像。聊一轮，大概十五分钟。',
          ),
        );
        body.push(
          h('textarea', {
            className: 'cmp-editor',
            style: { minHeight: 220 },
            value: summary,
            placeholder: '还没有。点下面的「聊一轮」。',
            onChange: (event) => setSummary(event.target.value),
          }),
        );
        body.push(
          h(
            'div',
            { className: 'cmp-actions', style: { marginTop: 12 } },
            h(
              'button',
              { type: 'button', className: 'cmp-primary', disabled: busy, onClick: save },
              busy ? '保存中…' : '保存',
            ),
            h(
              'button',
              { type: 'button', className: 'cmp-ghost', disabled: busy, onClick: () => start('quick') },
              '快一点 · 5 题',
            ),
            h(
              'button',
              { type: 'button', className: 'cmp-ghost', disabled: busy, onClick: () => start('standard') },
              '正常 · 12 题',
            ),
            h(
              'button',
              { type: 'button', className: 'cmp-ghost', disabled: busy, onClick: () => start('deep') },
              '慢慢聊 · AI 追问',
            ),
            status ? h('span', { className: 'cmp-saved' }, status) : null,
          ),
        );
      }

      return h(
        'div',
        { className: 'cmp-roster' },
        h(
          'div',
          { className: 'cmp-roster-head' },
          h('button', { type: 'button', className: 'cmp-pill', onClick: onBack }, '← 回去'),
          h('div', { className: 'cmp-name', style: { fontSize: 16 } }, '关于我'),
        ),
        h('div', { className: 'cmp-field', style: { marginTop: 18 } }, '你在哪个城市'),
        h(
          'div',
          { style: { display: 'flex', gap: 8 } },
          h('input', {
            className: 'cmp-input',
            style: { height: 34, minHeight: 34, padding: '6px 10px' },
            value: city,
            placeholder: '例如 杭州',
            onChange: (event) => setCity(event.target.value),
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'cmp-ghost',
              style: { height: 34, padding: '0 14px' },
              disabled: busy,
              onClick: saveCity,
            },
            '保存',
          ),
        ),
        h(
          'p',
          { className: 'cmp-hint' },
          '这个位置决定你和她之间的距离——影响她寄东西要多久、以及她平时怎么跟你说话。',
        ),
        ...body,
        error ? h('div', { className: 'cmp-err' }, error) : null,
      );
    }

    function Conversations({ roster, onOpen, onMore, onNew, onMeet, onPortrait, busy }) {
      return h(
        'div',
        { className: 'cmp-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'cmp-head' },
          h('div', { className: 'cmp-name', style: { fontSize: 16 } }, '对话'),
          h(
            'div',
            { className: 'cmp-toggles' },
            h(
              'button',
              { type: 'button', className: 'cmp-primary', style: { height: 30, padding: '0 14px', fontSize: 12.5 }, disabled: busy, onClick: onMeet },
              busy ? '正在遇见…' : '遇见一个人',
            ),
            h('button', { type: 'button', className: 'cmp-pill', onClick: onPortrait }, '关于我'),
            h('button', { type: 'button', className: 'cmp-pill', onClick: onMore }, '管理'),
          ),
        ),
        roster.length === 0
          ? h('div', { className: 'cmp-conv-empty' }, '还没有人。点右上角「新写一个」。')
          : h(
              'div',
              { className: 'cmp-convs' },
              roster.map((entry) =>
                h(
                  'button',
                  {
                    key: entry.id,
                    type: 'button',
                    className: `cmp-conv${entry.active ? ' on' : ''}`,
                    onClick: () => onOpen(entry),
                  },
                  h(Avatar, {
                    persona: { name: entry.name, initial: entry.initial, avatar: entry.avatar },
                  }),
                  h(
                    'div',
                    { className: 'cmp-conv-main' },
                    h(
                      'div',
                      { className: 'cmp-conv-top' },
                      h('span', { className: 'cmp-conv-name' }, entry.name),
                      h('span', { className: 'cmp-conv-time' }, convTime(entry.lastAt)),
                    ),
                    h(
                      'div',
                      { className: 'cmp-conv-preview' },
                      entry.status === 'archived'
                        ? '已停用'
                        : entry.lastText
                          ? `${entry.lastMine ? '我：' : ''}${entry.lastText}`
                          : entry.cityLabel || '还没说过话',
                    ),
                  ),
                  entry.unread
                    ? h('span', { className: 'cmp-unread' }, entry.unread > 99 ? '99+' : entry.unread)
                    : null,
                ),
              ),
            ),
      );
    }

    /* -------------------------------------------------------------- *
     * Rules
     * -------------------------------------------------------------- */

    function GiftsPage({ onBack }) {
      const [data, setData] = React.useState(null);
      const [open, setOpen] = React.useState(null);
      const [context, setContext] = React.useState({});
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        api('gifts.list')
          .then((payload) => setData(payload))
          .catch((cause) => setError(String(cause?.message || cause)));
      }, []);

      const toggle = async (gift) => {
        if (open === gift.seq) {
          setOpen(null);
          return;
        }
        setOpen(gift.seq);
        if (context[gift.seq]) return;
        try {
          const payload = await api('gifts.context', { seq: gift.seq });
          setContext((current) => ({ ...current, [gift.seq]: payload }));
        } catch (cause) {
          setError(String(cause?.message || cause));
        }
      };

      const body = [];
      if (!data) {
        body.push(h('p', { className: 'cmp-hint' }, '正在读…'));
      } else {
        if (data.parcels.length) {
          body.push(h('div', { className: 'cmp-field', style: { marginTop: 0 } }, '在途'));
          for (const parcel of data.parcels) {
            body.push(
              h(
                'div',
                { key: `p-${parcel.name}`, className: 'cmp-gift' },
                h('span', { className: 'cmp-gift-emoji' }, parcel.emoji),
                h(
                  'div',
                  { className: 'cmp-gift-main' },
                  h('div', { className: 'cmp-gift-name' }, parcel.name),
                  h(
                    'div',
                    { className: 'cmp-gift-meta' },
                    `${parcel.from === 'him' ? '你在寄' : '她在买'} · ${kindLabel(
                      parcel.kind,
                    )}${parcel.km ? ` · ${parcel.km} 公里` : ''} · ${etaLabel(parcel.minutes)}`,
                  ),
                ),
              ),
            );
          }
        }
        body.push(h('div', { className: 'cmp-field' }, `往来 · ${data.gifts.length} 件`));
        if (!data.gifts.length) {
          body.push(h('p', { className: 'cmp-hint' }, '还没有互相送过东西。'));
        }
        for (const gift of data.gifts) {
          const ctx = context[gift.seq];
          body.push(
            h(
              'button',
              {
                key: gift.seq,
                type: 'button',
                className: 'cmp-gift',
                onClick: () => void toggle(gift),
              },
              h('span', { className: 'cmp-gift-emoji' }, gift.emoji),
              h(
                'div',
                { className: 'cmp-gift-main' },
                h('div', { className: 'cmp-gift-name' }, gift.name),
                h(
                  'div',
                  { className: 'cmp-gift-meta' },
                  [
                    gift.from === 'him' ? '你送的' : '她送的',
                    gift.cost ? `${gift.cost} 元` : '',
                    dayStamp(gift.ts),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                ),
              ),
              h('span', { className: 'cmp-gift-meta' }, open === gift.seq ? '收起' : '当时'),
            ),
          );
          if (open === gift.seq) {
            body.push(
              h(
                'div',
                { key: `c-${gift.seq}`, className: 'cmp-gift-ctx' },
                !ctx
                  ? h('div', { className: 'cmp-ctx-line' }, '正在读…')
                  : ctx.gone
                    ? h('div', { className: 'cmp-ctx-line' }, '那段对话已经被清掉了。')
                    : (ctx.context || []).map((line) =>
                        h(
                          'div',
                          {
                            key: line.seq,
                            className: `cmp-ctx-line${line.seq === ctx.focus ? ' focus' : ''}`,
                          },
                          h('span', { className: 'cmp-ctx-who' }, line.role === 'user' ? '你' : '她'),
                          h('span', { className: 'cmp-ctx-body' }, line.text),
                        ),
                      ),
              ),
            );
          }
        }
      }

      return h(
        'div',
        { className: 'cmp-roster' },
        h(
          'div',
          { className: 'cmp-roster-head' },
          h('button', { type: 'button', className: 'cmp-pill', onClick: onBack }, '← 回去聊天'),
          h('div', { className: 'cmp-name', style: { fontSize: 16 } }, '物品'),
        ),
        ...body,
        error ? h('div', { className: 'cmp-err' }, error) : null,
      );
    }

    function RulesPage({ onBack }) {
      const [text, setText] = React.useState(null);
      const [path, setPath] = React.useState('');
      const [status, setStatus] = React.useState('');
      const [city, setCity] = React.useState('');
      const [error, setError] = React.useState(null);
      const [saving, setSaving] = React.useState(false);
      const [busy, setBusy] = React.useState(false);
      const [preview, setPreview] = React.useState(null);

      React.useEffect(() => {
        api('rules.get')
          .then((data) => {
            setText(data.text);
            setPath(data.path || '');
          })
          .catch((cause) => setError(String(cause?.message || cause)));
      }, []);

      const loadPreview = async () => {
        setBusy(true);
        setError(null);
        try {
          const data = await api('prompt.preview');
          setPreview(data.text);
        } catch (cause) {
          setError(String(cause?.message || cause));
        } finally {
          setBusy(false);
        }
      };

      const save = async () => {
        setSaving(true);
        setError(null);
        setStatus('');
        try {
          const data = await api('rules.save', { text });
          setText(data.text);
          setStatus('已保存，下一句就生效');
        } catch (cause) {
          setError(String(cause?.message || cause));
        } finally {
          setSaving(false);
        }
      };

      return h(
        'div',
        { className: 'cmp-roster' },
        h(
          'div',
          { className: 'cmp-roster-head' },
          h('button', { type: 'button', className: 'cmp-pill', onClick: onBack }, '← 回去聊天'),
          h('div', { className: 'cmp-name', style: { fontSize: 16 } }, '语气与规则'),
        ),
        h(
          'p',
          { className: 'cmp-p' },
          '直接写一行就是追加，优先级最高；用 [section: style] / [section: sample] / [section: relation] 开头，则整段替换掉内置的那一段。以 # 开头的行是注释，不会发给她。保存后下一句生效。',
        ),
        preview !== null
          ? h(
              'div',
              null,
              h('pre', { className: 'cmp-preview' }, preview),
              h(
                'div',
                { className: 'cmp-actions', style: { marginTop: 12 } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'cmp-ghost',
                    onClick: () => setPreview(null),
                  },
                  '返回编辑',
                ),
                h(
                  'button',
                  { type: 'button', className: 'cmp-ghost', disabled: busy, onClick: loadPreview },
                  '刷新',
                ),
              ),
            )
          : h(
              'div',
              null,
              text === null
                ? h('p', { className: 'cmp-hint' }, '正在读…')
                : h('textarea', {
                    className: 'cmp-editor',
                    value: text,
                    spellCheck: false,
                    onChange: (event) => {
                      setText(event.target.value);
                      setStatus('');
                    },
                  }),
              error ? h('div', { className: 'cmp-err' }, error) : null,
              h(
                'div',
                { className: 'cmp-actions', style: { marginTop: 14 } },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'cmp-primary',
                    disabled: saving || text === null,
                    onClick: save,
                  },
                  saving
                    ? h(React.Fragment, null, h('span', { className: 'cmp-spin' }), '保存中…')
                    : '保存',
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'cmp-ghost',
                    disabled: busy,
                    onClick: loadPreview,
                  },
                  busy ? '读取中…' : '看当前提示词',
                ),
                status ? h('span', { className: 'cmp-saved' }, status) : null,
              ),
            ),
        error && preview !== null ? h('div', { className: 'cmp-err' }, error) : null,
        path ? h('div', { className: 'cmp-path' }, `文件：${path}`) : null,
      );
    }

    /* -------------------------------------------------------------- *
     * Panel
     * -------------------------------------------------------------- */

    function Panel({ t }) {
      const tr = (key, fallback) => {
        try {
          const value = typeof t === 'function' ? t(key) : undefined;
          return value && value !== key ? value : fallback;
        } catch {
          return fallback;
        }
      };

      const [persona, setPersona] = React.useState(null);
      const [status, setStatus] = React.useState(null);
      const [messages, setMessages] = React.useState([]);
      const messagesRef = React.useRef([]);
      const [typing, setTyping] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [draft, setDraft] = React.useState(null);
      const [roster, setRoster] = React.useState([]);
      const [builtins, setBuiltins] = React.useState([]);
      const [trial, setTrial] = React.useState(null);
      const [encounter, setEncounter] = React.useState(null);
      const [parcels, setParcels] = React.useState([]);
      const [weather, setWeather] = React.useState(null);
      const [distance, setDistance] = React.useState(null);
      const [cityDraft, setCityDraft] = React.useState('');
      const [ready, setReady] = React.useState(false);
      const [view, setView] = React.useState('auto');
      const [text, setText] = React.useState('');
      const [showLife, setShowLife] = React.useState(false);
      const [busyId, setBusyId] = React.useState(null);
      const [showStickers, setShowStickers] = React.useState(false);
      const [showGifts, setShowGifts] = React.useState(false);
      const [giftText, setGiftText] = React.useState('');
      const [giftChannel, setGiftChannel] = React.useState('courier');
      const [giftEta, setGiftEta] = React.useState(18);

      const since = React.useRef(0);
      const readRef = React.useRef(true);
      const stickRef = React.useRef(true);
      const olderRef = React.useRef(false);
      const hasMoreRef = React.useRef(true);
      const listRef = React.useRef(null);
      const inputRef = React.useRef(null);

      React.useEffect(() => {
        messagesRef.current = messages;
      }, [messages]);

      const absorb = React.useCallback((data, reset = false) => {
        if (reset) {
          since.current = 0;
          setMessages([]);
          hasMoreRef.current = true;
          stickRef.current = true;
        }
        if (data.persona !== undefined) setPersona(data.persona);
        if (data.status !== undefined) setStatus(data.status);
        if (data.draft !== undefined) setDraft(data.draft);
        if (Array.isArray(data.roster)) setRoster(data.roster);
        if (Array.isArray(data.builtins)) setBuiltins(data.builtins);
        if (data.trial !== undefined) setTrial(data.trial ? data.trialDays : null);
        if (data.encounter !== undefined) setEncounter(data.encounter);
        if (Array.isArray(data.parcels)) setParcels(data.parcels);
        if (data.weather !== undefined) setWeather(data.weather);
        if (data.distance !== undefined) setDistance(data.distance);
        setTyping(Boolean(data.typing));
        if (data.error !== undefined) setError(data.error);
        if (Array.isArray(data.messages) && data.messages.length) {
          const incoming = data.messages;
          since.current = Math.max(since.current, incoming[incoming.length - 1].seq);
          setMessages((previous) => {
            const known = new Set(previous.map((m) => m.seq));
            return previous.concat(incoming.filter((m) => !known.has(m.seq)));
          });
        }
        setReady(true);
      }, []);

      React.useEffect(() => {
        let stopped = false;
        let timer = null;
        const tick = async () => {
          try {
            const data = await api('state', { since: since.current, read: readRef.current });
            if (!stopped) absorb(data);
          } catch (cause) {
            if (!stopped) {
              setError(String(cause?.message || cause));
              setReady(true);
            }
          }
          if (!stopped) timer = setTimeout(tick, 1500);
        };
        tick();
        return () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        };
      }, [absorb]);

      React.useEffect(() => {
        readRef.current = !draft && (view === 'chat' || (view === 'auto' && roster.length <= 1));
      }, [view, draft, roster.length]);

      React.useEffect(() => {
        if (!stickRef.current) return;
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, [messages.length, typing]);

      const loadOlder = React.useCallback(async () => {
        if (olderRef.current || !hasMoreRef.current) return;
        const el = listRef.current;
        if (!el || el.scrollTop > 80) return;
        olderRef.current = true;
        const previousHeight = el.scrollHeight;
        const previousTop = el.scrollTop;
        try {
          const oldest = messagesRef.current[0];
          if (!oldest) return;
          const data = await api('messages.before', { seq: oldest.seq, limit: 40 });
          hasMoreRef.current = data.messages.length === 40;
          if (data.messages.length) {
            setMessages((previous) => {
              const known = new Set(previous.map((m) => m.seq));
              return data.messages.filter((m) => !known.has(m.seq)).concat(previous);
            });
            requestAnimationFrame(() => {
              const node = listRef.current;
              if (node) node.scrollTop = node.scrollHeight - previousHeight + previousTop;
            });
          }
        } catch {
          /* ignore, the next scroll retries */
        } finally {
          olderRef.current = false;
        }
      }, []);

      const onScroll = (event) => {
        const el = event.currentTarget;
        stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (el.scrollTop < 80) void loadOlder();
      };

      const sendGift = async (gift) => {
        setShowGifts(false);
        setGiftText('');
        setError(null);
        try {
          const data = await api('send.item', {
            name: gift.name,
            emoji: gift.emoji,
            channel: giftChannel,
            minutes: giftChannel === 'takeout' ? giftEta : giftEta * 60,
            since: since.current,
          });
          absorb({ ...data, typing: false });
        } catch (cause) {
          setError(String(cause?.message || cause));
        }
      };

      const sendSticker = async (sticker) => {
        setShowStickers(false);
        setError(null);
        try {
          const data = await api('send', { sticker, since: since.current });
          absorb({ ...data, typing: false });
        } catch (cause) {
          setError(String(cause?.message || cause));
        }
      };

      const send = async () => {
        const value = text.trim();
        if (!value) return;
        setText('');
        setError(null);
        try {
          const data = await api('send', { text: value, since: since.current });
          absorb({ ...data, typing: false });
        } catch (cause) {
          setError(String(cause?.message || cause));
          setText(value);
        }
        if (inputRef.current) inputRef.current.focus();
      };

      const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
          event.preventDefault();
          void send();
        }
      };

      const act = async (action, id) => {
        setError(null);
        setBusyId(id || 'new');
        try {
          if (action === 'new') {
            const data = await api('characters.new');
            setDraft(data.draft);
            setView('chat');
          } else if (action === 'city') {
            absorb(await api('profile.city', { city: id }), true);
            setCityDraft('');
          } else if (action === 'meet') {
            const data = await api('characters.meet');
            absorb(data, true);
            setView('chat');
          } else if (action === 'builtin') {
            const data = await api('characters.builtin', { id });
            absorb(data, true);
            setView('chat');
          } else if (action === 'switch') {
            const data = await api('characters.switch', { id });
            absorb(data, true);
            setView('chat');
          } else if (action === 'disable') {
            absorb(await api('characters.status', { id, archived: true }), true);
          } else if (action === 'enable') {
            absorb(await api('characters.status', { id, archived: false }), true);
          } else if (action === 'delete') {
            absorb(await api('characters.delete', { id }), true);
          } else if (action === 'retrial') {
            const data = await api('characters.retrial', { id });
            setDraft(data.draft);
            if (Array.isArray(data.roster)) setRoster(data.roster);
        if (Array.isArray(data.builtins)) setBuiltins(data.builtins);
            setView('chat');
          }
        } catch (cause) {
          setError(String(cause?.message || cause));
        } finally {
          setBusyId(null);
        }
      };

      if (!ready) {
        return h('div', { className: 'cmp-root' }, h('style', null, CSS));
      }

      if (draft) {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(Wizard, {
            draft,
            canCancel: roster.length > 0,
            onDraft: setDraft,
            onCancel: () =>
              api('characters.cancel')
                .then((data) => absorb(data, true))
                .catch((cause) => setError(String(cause?.message || cause))),
            onLocked: (data) => {
              setView('chat');
              absorb(data, true);
            },
          }),
        );
      }

      if (!persona) {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(
            'div',
            { className: 'cmp-wizard' },
            h(
              'div',
              { className: 'cmp-wizard-inner' },
              h('h1', { className: 'cmp-h1' }, '挑一个，直接开始'),
              h(
                'p',
                { className: 'cmp-p' },
                '内置的几个人已经写好了，点一下就能聊。想自己定也可以。',
              ),
              builtins.map((entry) =>
                h(
                  'button',
                  {
                    key: entry.id,
                    type: 'button',
                    className: 'cmp-cand',
                    disabled: Boolean(busyId),
                    onClick: () => act('builtin', entry.id),
                  },
                  h(
                    'div',
                    { className: 'cmp-cand-name' },
                    entry.name,
                    busyId === entry.id ? h('span', { className: 'cmp-cand-status' }, '…') : null,
                  ),
                  h('div', { className: 'cmp-cand-line' }, entry.blurb),
                ),
              ),
              error ? h('div', { className: 'cmp-err' }, error) : null,
              h(
                'div',
                { className: 'cmp-actions', style: { marginTop: 10 } },
                h(
                  'button',
                  { type: 'button', className: 'cmp-ghost', onClick: () => act('new') },
                  '自己写一个',
                ),
              ),
            ),
          ),
        );
      }

      if (view === 'gifts') {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(GiftsPage, { onBack: () => setView('chat') }),
        );
      }

      if (view === 'portrait') {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(PortraitPage, { onBack: () => setView('list') }),
        );
      }

      if (view === 'rules') {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(RulesPage, { onBack: () => setView('chat') }),
        );
      }

      const shown = view === 'auto' ? (roster.length > 1 ? 'list' : 'chat') : view;

      if (shown === 'list') {
        return h(Conversations, {
          roster,
          busy: busyId === 'meet',
          onOpen: (entry) => (entry.active ? setView('chat') : act('switch', entry.id)),
          onMore: () => setView('roster'),
          onNew: () => act('new'),
          onMeet: () => act('meet'),
          onPortrait: () => setView('portrait'),
        });
      }

      if (view === 'roster') {
        return h(
          'div',
          { className: 'cmp-root' },
          h('style', null, CSS),
          h(Roster, { roster, builtins, busyId, onBack: () => setView('chat'), onAction: act }),
          error ? h('div', { className: 'cmp-error' }, error) : null,
        );
      }

      const sub =
        weather && weather.her ? `${weather.her.temp}°C ${weather.her.text}` : '';

      const rows = [];
      if (encounter) {
        rows.push(
          h(
            'div',
            { key: 'encounter', className: 'cmp-encounter' },
            h('div', { className: 'cmp-encounter-tag' }, '你们是这样认识的'),
            h(
              'div',
              { className: 'cmp-encounter-when' },
              `${encounter.when} · ${encounter.where}`,
            ),
            encounter.moment ? h('div', { className: 'cmp-encounter-line' }, encounter.moment) : null,
            encounter.look ? h('div', { className: 'cmp-encounter-line' }, encounter.look) : null,
          ),
        );
      }
      let previousTs = 0;
      for (const message of messages) {
        if (!previousTs || message.ts - previousTs > 8 * 60 * 1000) {
          rows.push(
            h(
              'div',
              { key: `time-${message.seq}`, className: 'cmp-time' },
              previousTs && !sameDay(previousTs, message.ts)
                ? dayStamp(message.ts)
                : clock(message.ts),
            ),
          );
        }
        previousTs = message.ts;
        const mine = message.role === 'user';
        const sticker = message.kind === 'sticker' && message.sticker ? message.sticker : null;
        const item = message.kind === 'item' && message.item ? message.item : null;
        rows.push(
          h(
            'div',
            { key: message.seq, className: `cmp-row ${mine ? 'me' : 'her'}` },
            !mine ? h(Avatar, { persona, small: true }) : null,
            item
              ? h(
                  'div',
                  { className: 'cmp-item' },
                  h('span', { className: 'cmp-item-emoji' }, item.emoji),
                  h(
                    'div',
                    null,
                    h('div', { className: 'cmp-item-name' }, item.name),
                    h(
                      'div',
                      { className: 'cmp-item-sub' },
                      mine ? '你送的' : item.cost ? `她买的 · ${item.cost} 元` : '她送的',
                    ),
                  ),
                )
              : sticker
              ? h(
                  'div',
                  { className: 'cmp-sticker' },
                  h('div', { className: 'cmp-sticker-emoji' }, sticker.emoji),
                  sticker.text ? h('div', { className: 'cmp-sticker-text' }, sticker.text) : null,
                )
              : h('div', { className: 'cmp-bubble' }, message.text),
          ),
        );
      }
      if (typing) {
        rows.push(
          h(
            'div',
            { key: 'typing', className: 'cmp-typing' },
            h('span', { className: 'cmp-dot' }),
            h('span', { className: 'cmp-dot' }),
            h('span', { className: 'cmp-dot' }),
          ),
        );
      }

      return h(
        'div',
        { className: 'cmp-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'cmp-head' },
          h(Avatar, { persona }),
          h(
            'div',
            { className: 'cmp-id' },
            h(
              'div',
              { className: 'cmp-name' },
              persona.name,
              status && status.travel
                ? h(
                    'span',
                    { className: 'cmp-place' },
                    `${status.travel.kind} · ${status.travel.label}`,
                  )
                : distance && distance.herPlace
                  ? h(
                      'span',
                      { className: 'cmp-place' },
                      [distance.herPlace, distance.kmLabel ? `距你${distance.kmLabel}` : '']
                        .filter(Boolean)
                        .join(' · '),
                    )
                  : null,
            ),
            h('div', { className: 'cmp-sub' }, sub),
          ),
          h(
            'div',
            { className: 'cmp-toggles' },
            roster.length > 1
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'cmp-pill',
                    title: '回到对话列表',
                    onClick: () => setView('list'),
                  },
                  '←',
                )
              : null,
            trial ? h('div', { className: 'cmp-trial' }, `磨合中 ${trial} 天`) : null,
            h('button', { type: 'button', className: 'cmp-pill', onClick: () => setView('gifts') }, '物品'),
            h(
              'button',
              {
                type: 'button',
                className: 'cmp-pill',
                onClick: () => setShowLife((value) => !value),
              },
              showLife ? tr('hideLife', '收起') : tr('showLife', '她在哪'),
            ),
            h('button', { type: 'button', className: 'cmp-pill', onClick: () => setView('rules') }, '设定'),
          ),
        ),
        parcels.length
          ? h(
              'div',
              { className: 'cmp-transit' },
              parcels.map((parcel, index) =>
                h(
                  'span',
                  { key: index, className: 'cmp-transit-item' },
                  `${parcel.emoji} ${parcel.name} · ${parcel.from === 'him' ? '寄往她那' : '在路上'} · ${kindLabel(parcel.kind)}${
                    parcel.km ? ` · ${parcel.km} 公里` : ''
                  } · ${etaLabel(parcel.minutes)}`,
                ),
              ),
            )
          : null,
        showLife && status
          ? h(
              'div',
              { className: 'cmp-life' },
              h(
                'div',
                { className: 'cmp-life-now' },
                [
                  status.travel
                    ? `${status.travel.kind} · ${status.travel.label}`
                    : status.cityLabel,
                  distance && distance.kmLabel ? `距你${distance.kmLabel}` : '',
                  weather && weather.her ? `${weather.her.temp}°C ${weather.her.text}` : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
              ),
              h(
                'div',
                null,
                h(
                  'div',
                  { className: 'cmp-life-fact' },
                  '她此刻在做什么、今天经历了什么，除非她说，你不会知道。',
                ),
              ),
              distance && distance.herKnown === false
                ? h(
                    'div',
                    { style: { marginTop: 10 } },
                    h('div', { className: 'cmp-life-fact' }, '这个城市不在表里，改一个真实城市：'),
                    h(
                      'div',
                      { style: { display: 'flex', gap: 8, marginTop: 6 } },
                      h('input', {
                        className: 'cmp-input',
                        style: { height: 32, minHeight: 32, padding: '5px 9px', fontSize: 13 },
                        value: cityDraft,
                        placeholder: '例如 杭州',
                        onChange: (event) => setCityDraft(event.target.value),
                      }),
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'cmp-mini',
                          onClick: () => act('city', cityDraft),
                        },
                        '改',
                      ),
                    ),
                  )
                : null,
            )
          : null,
        h(
          'div',
          { className: 'cmp-list', ref: listRef, onScroll },
          !messages.length
            ? h(
                'div',
                { className: 'cmp-empty' },
                h('div', null, `${persona.name}有自己的作息，回消息不一定快。`),
                h('div', null, '她愿意讲的时候，你才会知道她在做什么。'),
              )
            : null,
          rows,
        ),
        error ? h('div', { className: 'cmp-error' }, error) : null,
        showGifts
          ? h(
              'div',
              { className: 'cmp-sticker-panel' },
              h(
                'div',
                { className: 'cmp-chips', style: { gridColumn: '1 / -1', margin: 0 } },
                CHANNELS.map(([value, label]) =>
                  h(
                    'button',
                    {
                      key: value,
                      type: 'button',
                      className: `cmp-chip${giftChannel === value ? ' on' : ''}`,
                      onClick: () => setGiftChannel(value),
                    },
                    label,
                  ),
                ),
                h(
                  'span',
                  { className: 'cmp-sticker-pick-text', style: { alignSelf: 'center' } },
                  (CHANNELS.find((entry) => entry[0] === giftChannel) || CHANNELS[1])[2],
                ),
              ),
              GIFTS.map((gift) =>
                h(
                  'button',
                  {
                    key: gift.name,
                    type: 'button',
                    className: 'cmp-sticker-pick',
                    onClick: () => void sendGift(gift),
                  },
                  h('span', { className: 'cmp-sticker-pick-emoji' }, gift.emoji),
                  h('span', { className: 'cmp-sticker-pick-text' }, gift.name),
                ),
              ),
              h(
                'div',
                { style: { display: 'flex', gap: 6, gridColumn: '1 / -1', marginTop: 4 } },
                h('input', {
                  className: 'cmp-input',
                  style: { minHeight: 34, height: 34, padding: '6px 10px', fontSize: 13 },
                  value: giftText,
                  placeholder: '或者自己写一样东西',
                  onChange: (event) => setGiftText(event.target.value),
                }),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'cmp-send',
                    style: { height: 34, padding: '0 14px' },
                    disabled: !giftText.trim(),
                    onClick: () => void sendGift({ name: giftText.trim(), emoji: '🎁' }),
                  },
                  '送',
                ),
              ),
            )
          : null,
        showStickers
          ? h(
              'div',
              { className: 'cmp-sticker-panel' },
              STICKERS.map((sticker) =>
                h(
                  'button',
                  {
                    key: sticker.emoji + sticker.text,
                    type: 'button',
                    className: 'cmp-sticker-pick',
                    onClick: () => void sendSticker(sticker),
                  },
                  h('span', { className: 'cmp-sticker-pick-emoji' }, sticker.emoji),
                  h('span', { className: 'cmp-sticker-pick-text' }, sticker.text),
                ),
              ),
            )
          : null,
        h(
          'div',
          { className: 'cmp-composer' },
          h(
            'button',
            {
              type: 'button',
              className: 'cmp-emoji-btn',
              title: '给她一样东西',
              onClick: () => {
                setShowGifts((value) => !value);
                setShowStickers(false);
              },
            },
            '🎁',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'cmp-emoji-btn',
              title: '表情包',
              onClick: () => {
                setShowStickers((value) => !value);
                setShowGifts(false);
              },
            },
            '🙂',
          ),
          h('textarea', {
            ref: inputRef,
            className: 'cmp-input',
            rows: 1,
            value: text,
            placeholder: tr('placeholder', '说点什么…'),
            onChange: (event) => setText(event.target.value),
            onKeyDown,
          }),
          h(
            'button',
            {
              type: 'button',
              className: 'cmp-send',
              disabled: !text.trim(),
              onClick: () => void send(),
            },
            tr('send', '发送'),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(
          () =>
            ctx.locale.register(NS, 'zh', {
              placeholder: '说点什么…',
              send: '发送',
              showLife: '她的今天',
              hideLife: '收起',
              asleep: '她大概已经睡了，这会儿回得会很慢。',
            }),
          'companion: locale zh',
        );
        ctx.effect(
          () =>
            ctx.locale.register(NS, 'en', {
              placeholder: 'Say something…',
              send: 'Send',
              showLife: 'Her day',
              hideLife: 'Hide',
              asleep: 'She is probably asleep — replies will be slow.',
            }),
          'companion: locale en',
        );

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'companion', locale: NS }, Panel),
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'companion', order: 20, label: () => '她' },
            Glyph,
          ),
        );
      },
    };
  },
});
