# ショート動画品質改善指示書 v4（1fpsグリッド差分反映版）

あなたは既存の Remotion 動画生成アプリを改善する実装エージェントです。  
対象リポジトリは `short-video-factory` です。

---

## 目的

現在の `output.mp4` を理想動画 `最終理想成果物.mp4` にできるだけ近づける。  
ただし全面作り直しではなく、**既存コードを活かして最小変更で最大効果を出すこと**。

---

## この指示書で重視すること

今回は感覚的な「なんとなく似せる」ではなく、**1fpsグリッドで確認できる事実**をもとに直すこと。

特に以下を守ること。

- 推測で勝手に理想像を補完しない
- まず現在の生成経路を特定する
- `generate` のCLI体験を壊さない
- 10件構成で **全順位 + CTA** まで必ず到達させる
- フレーム単位で確認できるレベルの修正を入れる

---

## 0. 1fpsグリッドから確定している事実

以下は `output.mp4` と理想動画の 1fps グリッド比較から読める**確定事項**。

### 0-1. イントロの作りが違う

理想動画:
- 冒頭は約3秒
- **左上寄せの多行タイトル**
- タイトルは白 + 黒縁、強調語が赤
- タイトルの下にイラスト
- 0秒から可視情報あり

現在の output:
- 冒頭タイトルが小さい
- 画面上端に押し込まれている
- 画像がない
- 途中で**暗転フレーム**が入る

### 0-2. ランク進行速度が違う

理想動画の秒単位進行は概ね以下。

- 0-2秒: イントロ
- 3秒: 第10位開始
- 8秒: 第9位開始
- 13秒: 第8位開始
- 18秒: 第7位開始
- 23秒: 第6位開始
- 28秒: 第5位開始
- 33秒: 第4位開始
- 38秒: 第3位開始
- 43秒: 第2位開始
- 48秒: 第1位開始
- 57秒: CTA開始

現在の output:
- 第10位だけで長すぎる
- 59秒台でまだ第6位
- 第5位〜第1位が消滅
- CTA未到達

### 0-3. ランク画面は「2段構成」

理想動画の各ランクは、ほぼ以下の2段構成。

#### Phase A: フック表示
- 上部に `第○位`
- 中央付近に赤い短いフック文
- 基本は**ボックスなし**
- 画像はまだ出ないか、出ても早すぎない

#### Phase B: コメント表示
- `第○位` は残る
- 白背景 + 色枠のコメントボックスが1〜2本
- 下部にイラスト
- フック文は消えるか、主役から外れる

### 0-4. 理想動画の画像サイズは「大きすぎないが、存在感はある」

重要:
- 理想動画の画像は**画面の半分を占めていない**
- ただし output よりは明らかに大きい
- 感覚的には**画面幅の18〜28%程度**が中心
- 画像は**下部中央寄せ**
- 透過PNGっぽい馴染み方が多い

つまり、以前の「画像50-60%」のような指定は過剰。  
今回は **`18〜28%を基準`** にすること。

### 0-5. コメントボックスの幅も広すぎない

理想動画:
- コメントボックスは画面全幅近くまでは使っていない
- 感覚的には**幅60〜72%程度**
- 2本が上下に積まれる
- 細長すぎず、読める高さがある

現在の output:
- 横長ラベル感が強い
- 業務資料っぽい
- 余白がスカスカ

### 0-6. 理想動画は暗転遷移をほぼ使っていない

現在の output では、ところどころで**暗いフルスクリーン遷移**が入る。  
理想動画では、1fpsグリッド上でそのような大きな暗転ブロックは見られない。

したがって:
- **黒画面・暗転遷移を原則禁止**
- ランク遷移は、`第○位 + フック文` の表示開始そのものを遷移にする
- フルスクリーンのフェードブラックは使わない

### 0-7. 理想動画は同じキャラを使い回している

理想動画では、9位〜7位付近で同じMC風イラストが連続利用されている。  
つまり、各順位で必ず別画像を探し直す必要はない。

したがって:
- **同系統イラストの再利用を許可すること**
- `reuseAssetKey` のような仕組みがあってよい
- 画像探し直しによる失敗や画風ブレを減らすこと

---

## 1. 最優先タスク: 現在の生成経路を確定する

見た目調整より前に、まず `output.mp4` を誰が作っているのかを確定すること。

### 調査対象
- `package.json`
- `src/cli/index.ts`
- `src/render-v3.ts`
- `src/remotion/Root.tsx`
- `buildPlan`
- `buildV3Plan`

### 確認事項
- `pnpm generate` はどのエントリを通るか
- その中で `buildPlan` と `buildV3Plan` のどちらを使っているか
- Composition は `RankingVideo` か `RankingVideoV2` か
- `render:v3` は fixtures 前提の専用経路か
- CLI引数 `--topic --items --speaker --dry-run` がどこで処理されているか

### 絶対ルール

**`render:v3` をそのまま `generate` に丸ごと差し替えないこと。**

正しくは:
- `src/cli/index.ts` の Commander ベースのCLI処理は維持
- CLI挙動は壊さない
- `buildPlan / RankingVideo` の使用箇所だけを、必要なら `buildV3Plan / RankingVideoV2` 系へ置換する

### 調査結果の報告形式

```text
使用コマンド: pnpm generate
エントリ: src/cli/index.ts → ???
plan builder: buildPlan / buildV3Plan
composition: RankingVideo / RankingVideoV2
render:v3 の実態: fixtures直読み専用 / CLI統合済み
現状の標準経路: 旧 / v3
1ランク最低尺: ???
暗転遷移の実装箇所: ???
```

---

## 2. テンポ設計を作り直す

今回の最大の問題はテンポ。  
CSSだけいじっても勝てない。**順位ごとの時間予算を先に固定**すること。

### 2-1. 全体尺ルール

- 動画全体: **59.5秒以内**
- items=10 のときは **全10位 + CTA** を完走
- items=5 のときも **全5位 + CTA** を完走
- CTA開始は、10件時に**57秒前後**を目安

### 2-2. 10件時の理想マイルストーン

```text
0-2s   イントロ
3s     第10位開始
8s     第9位開始
13s    第8位開始
18s    第7位開始
23s    第6位開始
28s    第5位開始
33s    第4位開始
38s    第3位開始
43s    第2位開始
48s    第1位開始
57s    CTA開始
```

### 2-3. 設計式

```ts
const FPS = 30;
const MAX_DURATION_FRAMES = Math.floor(59.5 * FPS);
const INTRO_FRAMES = 90;   // 約3秒
const CTA_FRAMES = 75;     // 約2.5秒
const AVAILABLE_RANK_FRAMES = MAX_DURATION_FRAMES - INTRO_FRAMES - CTA_FRAMES;
const FRAMES_PER_RANK = Math.floor(AVAILABLE_RANK_FRAMES / items);

const PHASE_A_RATIO = 0.32;
const PHASE_B_RATIO = 0.68;

const phaseAFrames = Math.round(FRAMES_PER_RANK * PHASE_A_RATIO);
const phaseBFrames = FRAMES_PER_RANK - phaseAFrames;
```

### 2-4. 10件時の目安

- 1ランクあたり: **約150〜165f**
- Phase A: **45〜55f**
- Phase B: **95〜110f**

### 2-5. 禁止事項

- 1ランクを 10秒以上使う
- 独立した「第○位だけ表示」遷移シーンを別に作る
- 暗転を挟む
- VOICEVOX音声の長さにシーン全体が引っ張られ続ける

---

## 3. レイアウト仕様（グリッド観察ベース）

### 3-1. イントロ

**理想に近い構図:**
- 左上にタイトルを多行で積む
- 左寄せ
- 強調語だけ赤
- タイトル下にイラスト
- 背景はそのまま

### イントロの実装ルール

- 0フレーム目からタイトルと画像を出す
- イントロは**中央寄せではなく、左上ブロック寄せを優先**
- 画像はタイトルの下、左〜中央寄り
- イントロ画像は**画面幅22〜32%目安**
- イントロの空白率を下げる

### 推奨スタイル

```css
.intro-title {
  font-size: clamp(50px, 6vw, 76px);
  font-weight: 900;
  line-height: 1.15;
  text-align: left;
  color: #fff;
  -webkit-text-stroke: 3px #111;
  text-shadow: 4px 4px 0 rgba(0,0,0,0.35);
}

.intro-emphasis {
  color: #d40000;
}

.intro-image {
  width: 28%;
  max-width: 320px;
  object-fit: contain;
}
```

### 3-2. Rank表示

- `第○位` は上部中央
- 白文字 + 黒縁
- 小さすぎない
- 常に見える

```css
.rank-number {
  font-size: clamp(60px, 6vw, 82px);
  font-weight: 900;
  color: #fff;
  -webkit-text-stroke: 3px #222;
  text-shadow: 3px 3px 0 rgba(0,0,0,0.35);
}
```

### 3-3. Phase A: フック文

- ボックスなし
- 赤文字主体
- 1〜2行
- 中央やや上
- 短く強く

```css
.hook-text {
  font-size: clamp(45px, 5vw, 66px);
  font-weight: 900;
  color: #cc0000;
  -webkit-text-stroke: 2px #fff;
  text-shadow: 3px 3px 0 rgba(0,0,0,0.28);
  line-height: 1.15;
  text-align: center;
}
```

### 3-4. Phase B: コメントボックス

- 白背景
- 青枠 / 赤枠
- 幅は**60〜72%**を基準
- 2本まで
- 高さを確保して読む余裕を持たせる
- 極端な横長ラベル禁止

```css
.comment-box {
  width: min(72%, 760px);
  min-height: 72px;
  padding: 12px 18px;
  background: rgba(255,255,255,0.96);
  border-radius: 6px;
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 700;
  line-height: 1.25;
}

.comment-box.blue {
  border: 3px solid #1e4fd1;
}

.comment-box.red {
  border: 3px solid #cc0000;
}
```

### 3-5. 画像配置

- 下部中央寄せ
- 大きすぎない
- でも output より明確に大きくする
- 基本は**画面幅18〜28%**
- 小さすぎるなら最低18%まで持ち上げる
- 透過PNG / 明るいイラスト優先

```css
.scene-image {
  width: clamp(180px, 22vw, 300px);
  max-height: 24%;
  object-fit: contain;
  position: absolute;
  left: 50%;
  bottom: 7%;
  transform: translateX(-50%);
}
```

### 3-6. CTA

- CTAは**文字のみでよい**
- 画像は不要
- 大きい多行文字
- 57秒前後から開始

```css
.cta-text {
  font-size: clamp(52px, 6vw, 84px);
  font-weight: 900;
  text-align: center;
  color: #fff;
  -webkit-text-stroke: 3px #111;
  text-shadow: 4px 4px 0 rgba(0,0,0,0.35);
}

.cta-emphasis {
  color: #d40000;
}
```

---

## 4. テキスト仕様を直す

理想動画は、長文をだらだら喋らない。  
**先に短く作ってから音声化**すること。

### 4-1. 文字数制限

- intro 全体: 40文字以内
- hook/topic: 20文字以内
- comment1: 12〜18文字
- comment2: 12〜20文字
- CTA全体: 18文字以内

### 4-2. スキーマ追加

```ts
introLines?: string[]
outroLines?: string[]
topicDisplayLines?: string[]
reuseAssetKey?: string
introLayout?: 'left-stack' | 'center-stack'
showImageInHook?: boolean
```

### 4-3. 改行ルール

- 日本語は意味単位で改行
- 文字数だけで機械分割しない
- `introLines` があればそれを優先
- `topicDisplayLines` があればそれを優先

---

## 5. 音声制約

### 5-1. 絶対ルール

- 冒頭 0〜0.2秒以内に音を入れる
- 0〜3秒無音禁止
- シーン間の無音ギャップは 0.3秒以下
- 平均音量は少なくとも **-23dB 以上** を目安

### 5-2. 実装方針

1. テキストを短く確定
2. VOICEVOX生成
3. 音声長が sceneBudget を超えたら再短縮
4. どうしても超える場合だけ速度調整を検討

### 5-3. 補正

- gain を上げる
- もしくは ffmpeg normalize を後段でかける
- ただしクリップさせすぎない

---

## 6. 画像取得戦略

### provider chain

1. `IrasutoyaProvider`
2. `PexelsProvider`
3. `LocalFallbackProvider`

### ルール

- いらすとや取得失敗で全体を落とさない
- provider 選択ログを出す
- 実写はフォールバック
- 同系統イラスト再利用を許可
- 明るいイラスト、透過PNG寄りを優先

### 実装注意

- スクレイピングに依存しすぎない
- provider interface を切って疎結合にする
- `reuseAssetKey` がある場合は再検索せず既存画像を再利用してよい

---

## 7. 暗転と遷移の禁止事項

今回ここはかなり重要。

### 禁止
- 黒画面
- 暗い全面フェード
- 暗い放射背景だけが単独で出る時間
- 何も起きていない1秒

### 推奨
- ランク切り替え = `第○位 + フック文` の出現
- コメントボックスの出現で Phase A → Phase B を表現
- トランジションは 0〜6f 程度の最小限でよい

---

## 8. 検証条件

### 自動検証

1. `pnpm typecheck`
2. `pnpm generate --topic "テスト" --items 5 --dry-run`
3. `pnpm generate --topic "テスト" --items 10 --dry-run`
4. 実レンダリング可能なら 10件構成を1本生成

### 10件時の自己チェック

| 秒 | 期待状態 |
|----|----------|
| 0s | タイトル + 背景 + 画像が見えている |
| 1s | イントロがしっかり読める |
| 3s | 第10位に入っている |
| 8s | 第9位に入っている |
| 13s | 第8位に入っている |
| 18s | 第7位に入っている |
| 23s | 第6位に入っている |
| 28s | 第5位に入っている |
| 33s | 第4位に入っている |
| 38s | 第3位に入っている |
| 43s | 第2位に入っている |
| 48s | 第1位に入っている |
| 57s | CTAに入っている |

### 見た目チェック

- [ ] イントロは左上寄せ多行タイトルになっているか
- [ ] 強調語が赤で目立っているか
- [ ] 画像サイズが小さすぎないか（18%未満になっていないか）
- [ ] 画像サイズが大きすぎないか（28%超で主役を食っていないか）
- [ ] コメントボックス幅が60〜72%程度に収まっているか
- [ ] ラベル感が強すぎないか
- [ ] 暗転フレームがないか
- [ ] CTAは文字だけで十分強いか

### 音声チェック

- [ ] 冒頭0.2秒以内に音があるか
- [ ] 無音ギャップが0.3秒以下か
- [ ] 音量が弱すぎないか

---

## 9. 受け入れ条件

### 経路
- [ ] `pnpm generate` のCLI挙動を維持
- [ ] `buildPlan / RankingVideo` 旧経路のまま放置していない
- [ ] 必要なら v3 系へ統合されている

### テンポ
- [ ] items=10 で全順位 + CTA 到達
- [ ] items=5 で全順位 + CTA 到達
- [ ] 10件時に 57秒前後で CTA 開始
- [ ] 各ランクが Phase A / Phase B の2段構成

### 見た目
- [ ] イントロが左上多行タイトル + 下画像構成
- [ ] rank number が上部中央
- [ ] hook 文がボックスなしで強く見える
- [ ] コメントボックスは60〜72%程度
- [ ] 画像は18〜28%程度で下部中央
- [ ] 暗転なし

### 音声
- [ ] 冒頭無音なし
- [ ] ギャップ極小
- [ ] 平均音量十分

### 素材
- [ ] Irasutoya → Pexels → Fallback の順
- [ ] 同系統イラスト再利用可
- [ ] providerログあり

---

## 10. 出力形式

```text
1. 現状分析
2. 現在の生成経路
3. 主要原因トップ5
4. 実装した修正
5. 変更ファイル一覧
6. 重要diff
7. 10件時の時間マイルストーン結果
8. 音声チェック結果
9. 見た目チェック結果
10. items=5 の結果
11. 未解決課題
```

---

## 補足

この v4 では、以前の指示書で過剰だった以下を修正している。

- イントロを「中央寄せ」ではなく、**左上多行タイトル寄せ**へ修正
- 画像サイズを「50-60%」ではなく、**18-28%基準**へ修正
- コメントボックス幅を「85%」ではなく、**60-72%基準**へ修正
- 10位でも必ず画像を出す、という過剰な固定をやめた
- CTAは文字のみでも成立する前提に修正
- 暗転禁止を明文化
- 同系統イラスト再利用を明文化
