"use client";

import { requestAIChatOpen } from "../../lib/ai/client/openContract";
import type { DeFiApp } from "../../lib/ai/contracts";

type Lang = "en" | "zh" | "zh-TW" | "ko" | "ja" | "es";

const copy: Record<Lang, { readOnly: string; action: Record<DeFiApp, string>; prompt: Record<DeFiApp, string> }> = {
  en: { readOnly: "read-only live data", action: { overview: "Ask BanmaoAI about DeFi", staking: "Review staking position", burn: "Preview burn impact", airdrop: "Check airdrop history", box: "Inspect BanmaoBox" }, prompt: { overview: "Summarize the Banmao DeFi apps and their risks.", staking: "Review current staking protocol data, rewards, and risks. Do not submit a transaction.", burn: "Show approved burn addresses and preview supply impact. Do not submit a transaction.", airdrop: "Show current airdrop statistics and explain what wallet data is available. Do not claim or submit.", box: "Show BanmaoBox deployment, renderer roles, registry, and collection totals. Do not create or submit." } },
  zh: { readOnly: "只读实时数据", action: { overview: "询问 BanmaoAI DeFi", staking: "检查质押仓位", burn: "预览销毁影响", airdrop: "检查空投历史", box: "查看 BanmaoBox" }, prompt: { overview: "总结 Banmao DeFi 应用及风险。", staking: "检查当前质押协议数据、奖励和风险。不要提交交易。", burn: "显示批准的销毁地址并预览供应影响。不要提交交易。", airdrop: "显示当前空投统计并说明可用的钱包数据。不要领取或提交。", box: "显示 BanmaoBox 部署、渲染器角色、注册表和收藏总量。不要创建或提交。" } },
  "zh-TW": { readOnly: "唯讀即時資料", action: { overview: "詢問 BanmaoAI DeFi", staking: "檢查質押部位", burn: "預覽銷毀影響", airdrop: "檢查空投紀錄", box: "查看 BanmaoBox" }, prompt: { overview: "總結 Banmao DeFi 應用及風險。", staking: "檢查目前質押協議資料、獎勵和風險。不要提交交易。", burn: "顯示核准的銷毀地址並預覽供應影響。不要提交交易。", airdrop: "顯示目前空投統計並說明可用的錢包資料。不要領取或提交。", box: "顯示 BanmaoBox 部署、渲染器角色、註冊表和收藏總量。不要建立或提交。" } },
  ko: { readOnly: "읽기 전용 실시간 데이터", action: { overview: "BanmaoAI에 DeFi 질문", staking: "스테이킹 포지션 검토", burn: "소각 영향 미리보기", airdrop: "에어드롭 기록 확인", box: "BanmaoBox 검사" }, prompt: { overview: "Banmao DeFi 앱과 위험을 요약해 주세요.", staking: "현재 스테이킹 데이터, 보상 및 위험을 검토하세요. 거래를 제출하지 마세요.", burn: "승인된 소각 주소와 공급 영향을 보여 주세요. 거래를 제출하지 마세요.", airdrop: "현재 에어드롭 통계와 사용 가능한 지갑 데이터를 설명하세요. 청구하거나 제출하지 마세요.", box: "BanmaoBox 배포, 렌더러 역할, 레지스트리 및 컬렉션 총계를 보여 주세요. 생성하거나 제출하지 마세요." } },
  ja: { readOnly: "読み取り専用ライブデータ", action: { overview: "BanmaoAIにDeFiを質問", staking: "ステーキングを確認", burn: "バーン影響をプレビュー", airdrop: "エアドロップ履歴を確認", box: "BanmaoBoxを確認" }, prompt: { overview: "Banmao DeFiアプリとリスクを要約してください。", staking: "現在のステーキングデータ、報酬、リスクを確認してください。取引は送信しないでください。", burn: "承認済みバーンアドレスと供給への影響を表示してください。取引は送信しないでください。", airdrop: "現在のエアドロップ統計と利用可能なウォレットデータを説明してください。請求や送信はしないでください。", box: "BanmaoBoxのデプロイ、レンダラー役割、レジストリ、コレクション合計を表示してください。作成や送信はしないでください。" } },
  es: { readOnly: "Datos en vivo de solo lectura", action: { overview: "Preguntar a BanmaoAI sobre DeFi", staking: "Revisar staking", burn: "Previsualizar quema", airdrop: "Consultar historial de airdrop", box: "Inspeccionar BanmaoBox" }, prompt: { overview: "Resume las aplicaciones DeFi de Banmao y sus riesgos.", staking: "Revisa los datos, recompensas y riesgos del staking. No envíes ninguna transacción.", burn: "Muestra las direcciones de quema aprobadas y el impacto en el suministro. No envíes ninguna transacción.", airdrop: "Muestra las estadísticas de airdrop y explica los datos de cartera disponibles. No reclames ni envíes.", box: "Muestra el despliegue de BanmaoBox, roles de renderizado, registro y totales. No crees ni envíes." } },
};

export default function DeFiAIContext({ app, lang }: { app: DeFiApp; lang: string }) {
  const text = copy[(lang in copy ? lang : "en") as Lang];
  return <aside className="defi-ai-context" data-banmao-ai-id={`defi-${app}`} aria-label={`BanmaoAI ${app} context`}>
    <span>{app}</span><span>X Layer</span><span>{text.readOnly}</span>
    <button type="button" onClick={() => requestAIChatOpen(window, { input: text.prompt[app] })}>{text.action[app]}</button>
  </aside>;
}
