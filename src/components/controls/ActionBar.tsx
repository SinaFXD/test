import { useState } from 'react';
import { connectedChartsDataUrl, initAllCharts } from '../../charts/registry';
import { togglePlay } from '../../hooks/usePlay';
import { useT } from '../../i18n';
import { buildCsv, composePng, copyText, downloadBlob } from '../../lib/export';
import { useData } from '../../state/data';
import { usePrefs } from '../../state/prefs';
import { scenarioValues, useScenario } from '../../state/scenario';
import { useSim } from '../../state/sim';
import { buildUrl } from '../../state/url-state';
import { useView } from '../../state/view';
import { DownloadIcon, ImageIcon, LinkIcon, PauseIcon, PlayIcon, ResetIcon } from '../icons';

function shareUrl(): string {
  const v = scenarioValues(useScenario.getState());
  const lang = usePrefs.getState().lang;
  return buildUrl(v, location.href, lang === 'en' ? { lang: 'en' } : {});
}

export function ActionBar() {
  const t = useT();
  const playing = useView((s) => s.playing);
  const showToast = useView((s) => s.showToast);
  const reset = useScenario((s) => s.reset);
  const [busy, setBusy] = useState(false);

  const onShare = async () => {
    showToast((await copyText(shareUrl())) ? t.copied : t.copyFailed);
  };

  const onCsv = () => {
    const { result, quarters } = useSim.getState();
    const data = useData.getState().data;
    if (!result) return;
    const csv = buildCsv(result, quarters, {
      dataAsOf: data?.generatedAt.slice(0, 10) ?? '',
      url: shareUrl(),
    });
    downloadBlob(csv, `fed-policy-lab-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const onPng = async () => {
    setBusy(true);
    try {
      await initAllCharts();
      const css = getComputedStyle(document.documentElement);
      const bg = css.getPropertyValue('--c-bg').trim() || '#070d1c';
      const url = connectedChartsDataUrl(bg);
      if (!url) return;
      const data = useData.getState().data;
      const blob = await composePng(url, {
        title: t.appName,
        subtitle: `${t.disclaimerShort} · ${data?.generatedAt.slice(0, 10) ?? ''}`,
        footer: `${t.sourceAttribution} · ${location.host}`,
        bg,
        fg: css.getPropertyValue('--c-text').trim() || '#fff',
        muted: css.getPropertyValue('--c-muted').trim() || '#aaa',
        rtl: document.documentElement.dir === 'rtl',
      });
      if (blob) downloadBlob(blob, `fed-policy-lab-${new Date().toISOString().slice(0, 10)}.png`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        className="btn btn-accent"
        onClick={togglePlay}
        aria-pressed={playing}
        title={t.playHint}
      >
        {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        {playing ? t.pause : t.play}
      </button>
      <button type="button" className="btn" onClick={reset}>
        <ResetIcon size={16} />
        {t.reset}
      </button>
      <button type="button" className="btn" onClick={onShare}>
        <LinkIcon size={16} />
        {t.share}
      </button>
      <button type="button" className="btn" onClick={onCsv}>
        <DownloadIcon size={16} />
        {t.exportCsv}
      </button>
      <button type="button" className="btn" onClick={onPng} disabled={busy}>
        <ImageIcon size={16} />
        {busy ? t.exporting : t.exportPng}
      </button>
    </div>
  );
}
