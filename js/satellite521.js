// satellite521.js v1.1
// 5-2-1点 / モード切替：双六(30点) or 綱引き(10点差)
// AI戦略：手動・1/3・ナッシュ均衡（勝者のみ得点の均衡：R=2/17,S=10/17,P=5/17）
(() => {
  // 手を 0,1,2 に割り振り（配列インデックスと対応させる）
  const R=0, S=1, P=2;
  // スコアと進行、およびログ画面表示用の日本語ラベル
  const N = ["グー","チョキ","パー"];
  // 勝ったときにもらえる点数（負けてもマイナスはなし）
  const POINTS = [1,2,5]; 
// 画面の要素をまとめて取得（id = JSとの接続ポート）
  const $ = (q)=>document.querySelector(q);
  const $$ = (q)=>Array.from(document.querySelectorAll(q));

  // --- UI参照 ---
  // モード
  const modeRadios = $$('input[name="mode"]');
  const viewSug = $("#viewSugoroku");
  const viewTug = $("#viewTug");
  // 成果表示（双六）
  const uFill = $("#uFill"), aFill = $("#aFill");
  const uScore = $("#uScore"), aScore = $("#aScore");
  // 成果表示（綱引き）
  const leftFill = $("#leftFill"), rightFill = $("#rightFill");
  const diffVal = $("#diffVal"), uScoreT = $("#uScoreT"), aScoreT = $("#aScoreT");
  // 操作他
  const btnR = $("#btnR"), btnS = $("#btnS"), btnP = $("#btnP"), btnReset = $("#btnReset");
  const resultLine = $("#resultLine"), logBox = $("#logBox");

  // AI分布
  const stratRadios = $$('input[name="strategy"]');
  const probR = $("#probR"), probS = $("#probS"), probP = $("#probP");
  const probRVal = $("#probRVal"), probSVal = $("#probSVal"), probPVal = $("#probPVal");

  // ゲームの状態（点数 / モード / ログ）を1か所に集約
  const state = {
    mode: "sugoroku", // "sugoroku" | "tug"
    su: 0, sa: 0,     // あなた/AIスコア
    logs: []
  };

  // --- AIミックス ---
  // 勝者のみ得点（R=+1, S=+2, P=+5）の対称均衡： (2/17, 10/17, 5/17)
  // 導出： 1*qS = 2*qP = 5*qR → 正規化
  const NASH = [2/17, 10/17, 5/17];

  function currentStrategy(){
    const v = stratRadios.find(r=>r.checked)?.value || "manual";
    return v; // "manual" | "uniform" | "nash"
  }
  function getAIMix(){
    const s = currentStrategy();
    if (s === "uniform") return [1/3,1/3,1/3];
    if (s === "nash")    return NASH.slice();
    // 手動：スライダ値を正規化
    let r=+probR.value, s2=+probS.value, p=+probP.value;
    let sum = r+s2+p;
    if (sum<=0){ r=s2=p=1; sum=3; }
    return [r/sum, s2/sum, p/sum];
  }
  function reflectAIMixToUI(){
    const mix = getAIMix();
    probRVal.textContent = mix[0].toFixed(3);
    probSVal.textContent = mix[1].toFixed(3);
    probPVal.textContent = mix[2].toFixed(3);

    const manual = (currentStrategy()==="manual");
    [probR,probS,probP].forEach(inp=>{
      inp.disabled = !manual;
      inp.style.opacity = manual ? "1" : "0.5";
    });
  }

  // --- 乱択 ---
  function sampleAI(){
    const [pr,ps,pp] = getAIMix();
    const x = Math.random();
    if (x < pr) return R;
    if (x < pr+ps) return S;
    return P;
  }

  // --- 判定 ---
  function judge(user, ai){
    if (user === ai) return 0; // draw
    if ((user===R && ai===S) || (user===S && ai===P) || (user===P && ai===R)) return 1; // user win
    return -1; // ai win
  }

  // --- 進行 ---
  function onUserPick(hand){
    const ai = sampleAI();
    const outcome = judge(hand, ai);

    let deltaU = 0, deltaA = 0;
    if (outcome === 1) { // user win
      deltaU = POINTS[hand];
      state.su += deltaU;
      resultLine.textContent = `あなた:${N[hand]} / AI:${N[ai]} → あなたの勝ち（+${deltaU}点）`;
    } else if (outcome === -1) {
      deltaA = POINTS[ai];
      state.sa += deltaA;
      resultLine.textContent = `あなた:${N[hand]} / AI:${N[ai]} → AIの勝ち（AI +${deltaA}点）`;
    } else {
      resultLine.textContent = `あなた:${N[hand]} / AI:${N[ai]} → あいこ`;
    }

    // ログ（最新→古い）
    const line = [
      `U=${N[hand]}`, `AI=${N[ai]}`,
      (outcome===0? "DRAW": outcome>0? `WIN(+${deltaU})`:`LOSE(AI+${deltaA})`),
      `SU=${state.su}`, `SA=${state.sa}`
    ].join("  ");
    state.logs.unshift(line);
    if (state.logs.length>60) state.logs.pop();
    logBox.textContent = state.logs.join("\n");

    render();
    checkGameEnd();
  }

  function checkGameEnd(){
    if (state.mode === "sugoroku") {
      if (state.su >= 30 || state.sa >= 30) {
        const final = (state.su===state.sa) ? "引き分け"
                    : (state.su>state.sa) ? "あなたの勝ち" : "AIの勝ち";
        resultLine.textContent += ` ｜ ゴール到達 → 最終：${final}`;
        setButtonsEnabled(false);
      }
    } else {
      const diff = state.su - state.sa;
      if (Math.abs(diff) >= 10) {
        const final = (diff===0) ? "引き分け" : (diff>0? "あなたの勝ち":"AIの勝ち");
        resultLine.textContent += ` ｜ 点差10達成 → 最終：${final}`;
        setButtonsEnabled(false);
      }
    }
  }

  function setButtonsEnabled(on){
    [btnR,btnS,btnP].forEach(b => b.disabled = !on);
  }

  // --- 描画 ---
  function render(){
    // モードビュー切替
    if (state.mode === "sugoroku") {
      viewSug.classList.remove("hidden");
      viewTug.classList.add("hidden");
    } else {
      viewSug.classList.add("hidden");
      viewTug.classList.remove("hidden");
    }

    // 双六バー
    const uPct = Math.max(0, Math.min(100, (state.su/30)*100));
    const aPct = Math.max(0, Math.min(100, (state.sa/30)*100));
    uFill.style.width = uPct + "%";
    aFill.style.width = aPct + "%";
    uScore.textContent = state.su;
    aScore.textContent = state.sa;

  // 綱引きバー：ベースはCSSグラデーション、diffだけ自軍色で相手側に上塗り
    const diff = state.su - state.sa;
    diffVal.textContent = diff;
    uScoreT.textContent = state.su;
    aScoreT.textContent = state.sa;

    // |diff| = 10 でバー半分(50%)まで伸びる
    const maxW = 50;
    const w = Math.max(0, Math.min(maxW, (Math.abs(diff) / 10) * maxW));

    if (diff > 0) {
      // あなた有利 → AI陣地側(右)にあなた色で上塗り
      rightFill.style.width = w + "%";
      leftFill.style.width  = "0%";
    } else if (diff < 0) {
      // AI有利 → あなた陣地側(左)にAI色で上塗り
      leftFill.style.width  = w + "%";
      rightFill.style.width = "0%";
    } else {
      // 差が0のときは上塗りなし（陣地だけ表示）
      leftFill.style.width  = "0%";
      rightFill.style.width = "0%";
    }


    // AI分布表示
    reflectAIMixToUI();
  }

  function resetAll(){
    state.su = 0; state.sa = 0; state.logs.length = 0;
    logBox.textContent = "—";
    resultLine.textContent = "—";
    setButtonsEnabled(true);
    render();
  }

  // --- wire ---
  btnR.addEventListener('click', ()=>onUserPick(R));
  btnS.addEventListener('click', ()=>onUserPick(S));
  btnP.addEventListener('click', ()=>onUserPick(P));
  btnReset.addEventListener('click', resetAll);

  modeRadios.forEach(r => r.addEventListener('change', ()=>{
    state.mode = r.value;
    resetAll(); // モード変更時はリセット
  }));

  stratRadios.forEach(r => r.addEventListener('change', ()=>{
    reflectAIMixToUI();
  }));

  [probR,probS,probP].forEach(inp => inp.addEventListener('input', ()=>{
    reflectAIMixToUI();
  }));

  // init
  reflectAIMixToUI();
  render();
})();
