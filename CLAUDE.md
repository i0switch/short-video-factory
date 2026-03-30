# Short Video Factory

縦型ショート動画を **1コマンドで自動生成** するツール。
ユーザーがテーマを伝えるだけで、AIが台本JSON作成 → `pnpm render:v3` で動画出力する。

## 一時ファイルルール【強制】

作業中に生成する一時ファイル（分析レポート、メモ、比較画像、グリッド画像、プロンプト下書き等）は **すべて `.workspace/` に出力すること。** ルート直下やsrc/に散らかすな。

- 出力先: `.workspace/`（.gitignore済み）
- 配布時にフォルダごと消せば綺麗になる
- 永続化が必要なナレッジは `docs/` に正式配置する

## スキル発動ルール【強制】

**タスクを受け取ったら、作業開始前に必ず対応するスキルを発動すること。スキルなしで作業を始めるな。**

| 作業内容 | 発動スキル |
|---|---|
| 新機能・コンポーネント追加・何か作る | `superpowers:brainstorming` |
| バグ・エラー・テスト失敗の修正 | `superpowers:systematic-debugging` |
| 複数ファイルにまたがる実装 | `superpowers:writing-plans` |
| 作業完了・コミット・PR前 | `superpowers:verification-before-completion` |
| レビューコメントへの対応 | `superpowers:receiving-code-review` |
| 独立した複数タスクを同時実行 | `superpowers:dispatching-parallel-agents` |
| Codexへの委譲が多い重い実装 | `superpowers:subagent-driven-development` |

### スキル発動フロー

```
タスク受け取り
  ↓
対応スキルを Skill ツールで発動
  ↓
スキルの指示に従って作業方針を決める
  ↓
Codex委譲ルールに照らして実行（投げるか自分でやるか）
```

### 判断が迷うとき
- 複数スキルが当てはまる → process系（brainstorming / debugging）を先に発動
- スキルが当てはまらない → そのまま作業してOK

---

## 対応フォーマット

| フォーマット | 説明 | テンプレ |
|---|---|---|
| **ランキング形式** | 10→1カウントダウン | `templates/scripts/ranking-black-company.json` |
| **2ch風ナラティブ** | 1話完結ストーリー（15-20シーン） | `templates/scripts/2ch-narrative.json` |
| **2ch風オムニバス** | 複数エピソード詰め合わせ | `templates/scripts/2ch-omnibus.json` |
| **2ch風超ショート** | 一発ネタ12秒 | `templates/scripts/2ch-ultrashort.json` |

## 動画生成ワークフロー（AIエージェント向け）

ユーザーが「動画作って」と言ったら:
1. **「どんなスタイルの動画がいい？」と聞く**（上記4種から選択）
2. 選択に応じたテンプレで台本JSON生成
3. `pnpm render:v3` でレンダリング

### Step 1: 台本JSONを生成する

テーマに合わせて `fixtures/sample-script.json` を作成する。テンプレは `templates/scripts/` を参考に。

#### ランキング形式（従来）

```json
{
  "videoTitle": "テーマのタイトル（20文字以内推奨）",
  "intro": "タイトルの読み上げテキスト",
  "items": [
    {
      "rank": 10,
      "topic": "お題（9文字以内推奨、画面に赤文字で大きく出る）",
      "comment1": "青枠コメント（共感系、15文字以内、青山龍星が読む）",
      "comment2": "赤枠コメント（ツッコミ系、15文字以内、四国めたんが読む）",
      "body": "ナレーション本文（画面に出ない、ずんだもんが読む）",
      "imageKeywords": ["日本語キーワード"],
      "imageKeywordsEn": ["english keyword"]
    }
  ],
  "outro": "みんなの意見はコメント欄へ！"
}
```

**台本作成ルール:**
- items は rank: 10 → 1 のカウントダウン順（10個推奨）
- `topic` は短く（画面に巨大フォントで出るため、長いと改行で崩れる）
- `comment1` は共感・疑問系（「〜だよね」「〜って思う」）
- `comment2` はツッコミ・断定系（「〜やろ」「〜に決まっとる」）
- `body` は topic の解説（30〜60文字、読み上げ専用）
- `imageKeywords` はいらすとや検索用（日本語1〜2語）
- `imageKeywordsEn` はPexels検索用（英語2〜3語）
- `videoTitle` は自動改行されるので7文字×3行=21文字程度がベスト
- タイトルシーンの下に白文字で「ランキング」が自動表示される（TitleScene.tsx）
- タイトルの改行はBudouX（手動`\n`がなければ自動分割）

#### 2ch風（新規）

```json
{
  "format": "2ch",
  "videoTitle": "タイトル（20文字以内）",
  "episodes": [
    {
      "title": "エピソードタイトル（オムニバスの場合）",
      "scenes": [
        {
          "speaker": "narrator|character1|character2",
          "text": "セリフテロップ（20文字以内、画面表示）",
          "narration": "読み上げテキスト（省略時はtextを使用）",
          "emotion": "neutral|anger|confusion|shock|happy|sad",
          "effect": "none|concentration_lines|vortex|lightning|sparkle|rain|shake",
          "imageKeywords": ["日本語キーワード"],
          "imageKeywordsEn": ["english keyword"]
        }
      ]
    }
  ],
  "outro": "チャンネル登録よろしく！"
}
```

**2ch風台本作成ルール:**
- scenes は15-20個が標準（1.5-3秒/シーン、合計40-60秒）
- **テンポ重要**: `maxDurationSec` は **35秒以内** を推奨。40秒超えるとダレる。迷ったら短くしろ
- **背景を必ず変える**: 同じ `backgroundSrc` は **最大3シーン連続** まで。場面転換ごとに背景を切り替えること
  - 例: キッチン→リビング→廊下→寝室→外 のように場所の移動を表現
  - 取得済み素材: `bg_kitchen.png`, `bg_living.jpg`, `bg_hallway.png`, `bg_bedroom.jpg` を活用
  - 感情変化でも背景を変える（怒り→暗い背景、ハッピー→明るい背景）
- `text` は画面表示テロップ（20文字以内推奨）
- `speaker` の声割り当て: **narrator=ずんだもん, character1=青山龍星(男声), character2=四国めたん(女声)**
- 男性キャラのセリフ→character1、女性キャラのセリフ→character2 にすること（逆にすると声が合わない）
- `emotion` は背景色を決める（neutral=ベージュ, anger=赤, confusion=青紫, shock=黒, happy=黄金, sad=暗青）
- `effect` はエフェクト（none/concentration_lines/vortex/lightning/sparkle/rain/shake）
- クライマックスには `concentration_lines` か `lightning` を使う
- 日常シーンは `neutral` + `none` でテンポよく
- オムニバスの場合は `episodes` を複数にし、各エピソードに `title` を付ける
- **オリジナル台本のタイトル**: 元動画のシリーズタイトル（「笑える迷語集」等）を流用しない。独自のシリーズ名を考える
  - 例: 「迷惑客図鑑」「バイトあるある」「接客の修羅場」「コンビニ戦記」等
  - タイトルバンドの line1 にシリーズ名、line2 にエピソード名を入れる
  - **エピソード名は7文字以内推奨**。8文字以上は自動縮小されるが見栄えが落ちる

### 素材指定ルール（必須・違反禁止）

**台本生成時、各シーンに `characterSrc` と `backgroundSrc` を必ず指定すること。**
いらすとやの自動検索だけに頼らず、ニコニ・コモンズの取得済み素材を積極的に使う。

**【絶対ルール】素材の使い回し禁止・台本内容との一致必須:**
- **backgroundSrcを削除してemotion自動背景に逃げるの禁止**。合わない背景があったら適切な素材を探して差し替える
- **imageKeywordsは各シーン/各ランクのtopicに固有のキーワードにする**。全シーン同じ`[男性, 困る]`のような汎用キーワードは禁止
- 「寝坊」のシーンなら`[寝坊, 男の子]`、「カップ麺」のシーンなら`[カップ麺]`のように**topicの内容を直接反映**する
- 素材が見つからない時は**ニコニ・コモンズで検索して新規取得**する。「面倒だから汎用画像でいい」は禁止思考

#### 使い方
```json
{
  "speaker": "character1",
  "text": "セリフ",
  "emotion": "happy",
  "effect": "none",
  "characterSrc": "assets/nicocommons/char_male_suit.png",
  "backgroundSrc": "assets/nicocommons/bg_kitchen.png",
  "imageKeywords": ["料理"],
  "imageKeywordsEn": ["cooking"]
}
```

#### 素材選定の優先順位
1. **背景**: ニコニ・コモンズ取得済み素材（`assets/nicocommons/`）→ `backgroundSrc` で直接指定
2. **キャラ**: いらすとや（`imageKeywords` で自動検索）→ **characterSrcは使わない**（アニメ立ち絵はテイストが合わない）
3. **Pexels**（`imageKeywordsEn` で自動検索）→ 上記で見つからない場合のフォールバック

#### いらすとやキーワードのルール（重要）
いらすとやの検索精度はキーワード次第で大きく変わる。以下を守ること:
- **imageKeywordsは必ず2要素以上の配列にする**（1要素だと関係ない画像が来る）
- **キャラ系は「人物属性 + 感情/動作」の組み合わせ**: `["男の子", "泣く"]` `["女の子", "ガッツポーズ"]` `["男性", "怒る"]`
- **物品系は具体的な単語1つ**: `["ハンバーグ"]` `["カレーライス"]` `["歯ブラシ"]`
- **抽象語・複合語は避ける**: ✕`["料理 失敗"]`（1要素に2語）→ ◯`["焦げる", "料理"]`（2要素）
- **「男性」より「男の子」「お父さん」等の方がヒット率高い**
- **よく使うキーワード例**:

| 用途 | imageKeywords |
|---|---|
| 笑顔の男性 | `["男の子", "笑顔"]` |
| 怒る男性 | `["男性", "怒る"]` |
| 困惑する男性 | `["男性", "困る"]` |
| 泣く男性 | `["泣く", "男の子"]` |
| 驚く男性 | `["驚く", "男性"]` |
| 笑顔の女性 | `["女の子", "笑顔"]` |
| 喜ぶ女性 | `["女の子", "嬉しい"]` |
| 怒る女性 | `["女性", "怒る"]` |
| 料理する女性 | `["女の子", "料理"]` |
| 夫婦 | `["夫婦", "仲良し"]` |

#### 必要な素材がない場合
- ニコニ・コモンズで検索して新規ダウンロード: `https://commons.nicovideo.jp/search?keywords=検索ワード&materialType=1`
- ダウンロード後 `assets/nicocommons/` に保存し、CLAUDE.md の取得済み素材テーブルに追記
- ライセンス確認必須:「利用許可範囲: インターネット全般 or どこでも」「収益化: OK」

#### 字幕とキャラ画像の被り禁止
- キャラ画像は画面下半分（50%以下）に配置
- 字幕は画面上部（10-35%）に半透明背景付きで表示
- 字幕とキャラの間に最低15%の空間を確保
- 台本の `text` は20文字以内にし、字幕が3行以上にならないようにする

#### 2ch動画生成仕様書（必読）
**`docs/2ch-video-spec.md`** に参考動画5本の解析結果に基づく詳細仕様がある。
2ch風動画を生成する際は必ずこの仕様書に従うこと。
- レイアウト（タイトルバンド / 字幕 / キャラの配置ルール）
- 話者別字幕カラー
- 感情別背景パレット
- エフェクトの使い方
- シーン構成パターン（Beat構造）
- レイヤー順序

### Step 2: レンダリング実行

```bash
pnpm render:v3
```

出力: `generated/latest/output.mp4`（BGM自動合成済み、約59秒）

### Step 3: 圧縮（任意）

```bash
ffmpeg -i generated/latest/output.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart generated/latest/output_compressed.mp4
```

### 前提条件
- VOICEVOX がローカルで起動していること（port 50021）
- ffmpeg が PATH に通っていること

---

## 技術スタック

TypeScript strict / pnpm / Remotion / VOICEVOX / ffmpeg / zod

## テキスト改行ルール（BudouX必須）

- 日本語テロップの改行には **必ず BudouX** (`src/utils/text-wrap.ts` の `wrapJapanese()`) を使う
- 文字数で機械的に切るな。BudouXが助詞・句読点・単語境界で自然に分割する
- `whiteSpace: 'nowrap'` をCSSに入れて、CSS側の自動折り返しを防ぐ
- フォントサイズは **分割後の最長行** に合わせて動的に計算する（分割前に決めるな）
- 8文字以下は1行強制、9文字以上はBudouXに委ねる

## デザイン上の重要ルール

- テキストは **巨大**（タイトル120px, 順位160px, トピック120px, コメント72px）
- 縁取りは **太い**（8px 黒 + paintOrder: stroke fill + drop shadow）
- サンバーストは **5deg 間隔**（10deg だと別物になる）
- body テキストは **画面に表示しない**（VOICEVOX 読み上げ専用）
- ランキングシーンのレイアウト: 順位(上) → 青枠+赤枠(中) → 画像(下)
- デザイン定数は `src/remotion/design-tokens.ts` に集約

## 重要な設計判断

- **マルチフォーマット**: `format` フィールドで分岐（'ranking' or '2ch'、未指定は ranking）
- **2段スキーマ**: Script → RenderPlan → Remotion（Remotion は Script を直接見ない）
- **ジョブ隔離**: generated/jobs/{timestamp}/ に出力。成功時のみ latest/ に昇格
- **BGM**: assets/bgm/ のmp3をffmpegで後から合成（Remotion外）
- **3話者**: ずんだもん(narrator) / 青山龍星(character1) / 四国めたん(character2)
- **2ch感情背景**: EmotionBackground.tsx で emotion に応じた背景色切替
- **2chエフェクト**: EffectLayer.tsx で集中線/渦巻き/稲妻/キラキラ/雨/画面揺れ

## 再現動画（ReproComposition）テンプレート

元動画を分析→いらすとや素材で再現する「Reproパイプライン」の知見。

### レンダリングコマンド
```bash
pnpm render:repro2 {videoId}
```
- 出力: `generated/repro/{videoId}/iter_XX/output.mp4`
- 最新: `generated/latest/完成.mp4`

### レイアウト定数（ReproComposition.tsx）

| 要素 | 値 | 理由 |
|------|---|------|
| タイトルバー高さ | 350px | 2行タイトル（145/155px）+ ストロークが収まる |
| 字幕位置 | top: 520px | タイトルバー下、キャラと被らない上部エリア |
| キャラサイズ倍率 | 1300 | いらすとや全身立ち絵は1920だとデカすぎる。1300で画面下半分に収まる |
| キャラ配置 | bottom: 55px | 画面最下部にアンカー |
| キャラズーム基点 | transformOrigin: 'center 35%' | ズーム時にキャラが下方向に拡大（字幕に被らない） |
| 字幕overflow | visible | 長文テキストのクリップ防止 |

**字幕とキャラの被り禁止ルール:**
- 字幕(520px) と キャラ頭部(~760px以下) の間に **最低240pxの空間** を確保
- `characterZoom` 1.3x でも `transformOrigin: 'center 35%'` により頭部は下に移動するので安全
- scale 0.85 のキャラ: size=1105px, 頭部=760px → 字幕520pxとの間に240px空間

### timeline.json ショット設計ルール

**フレーム配分の目安（30fps）:**

| ショット種別 | フレーム数 | 秒数 | 用途 |
|------------|----------|------|------|
| 超短 | 25f | 0.83s | 一言リアクション（「ねえ」「よし！」） |
| 短 | 30f | 1.0s | アクション（食パン取る、歯ブラシ） |
| 中 | 40-50f | 1.3-1.7s | 通常セリフ・解説 |
| 長 | 60-75f | 2.0-2.5s | 実況（グランプリ開始等） |
| エンディング | 80-140f | 2.7-4.7s | 締めのセリフ（余剰フレーム吸収用） |

**ショット追加時の注意:**
- 合計フレーム数は変えない（42秒=1260f等）
- 周辺の長いショットから均等にフレームを借りる
- エンディングショットで余剰/不足を吸収
- 追加は **末尾から先頭に向かって** 処理すると、前のショットに影響しない

**タイミング調整のPDCA:**
1. レンダリング → 30fps フレーム抽出
2. 元動画と1秒ずつ比較画像生成（hstack）
3. グリッド画像（tile=7x6）で全体俯瞰
4. ずれてる秒を特定 → duration 調整 → 再レンダリング
5. GEN遅れ → 先行ショットを短く / GEN先行 → 先行ショットを長く

### エフェクトと演出の使い分け

| 演出 | 用途 | timeline.json の指定 |
|------|------|---------------------|
| characterZoom | キャラが迫ってくる・力む | `"characterZoom": { "from": 1.0, "to": 1.3 }` |
| characterSlide | キャラが移動（入場/退場） | `"characterSlide": { "fromX": -500, "toX": 0 }` |
| speed_lines | 移動シーン | `"effect": "speed_lines"` |
| concentration_white | 気合・実況ハイライト | `"effect": "concentration_white"` |
| sparkle | 成功・キラキラ | `"effect": "sparkle"` |
| rain (dark_rain) | 失敗・減点 | `"effect": "rain"`, background: "dark_rain" |

### 台本からショットへの変換パターン

| 台本の場面 | speaker | effect | characterZoom | captionFontScale |
|-----------|---------|--------|---------------|-----------------|
| 実況開始・タイトルコール | character1 | concentration_white | 1.0→1.3 | 1.2-1.3 |
| アクション描写 | character1 | speed_lines or none | なし | なし |
| 成功・達成 | character1 | sparkle | 1.0→1.3 | なし |
| ツッコミ（彼女） | character2 | none | なし | なし |
| 一言リアクション | character2 | none | なし | なし |
| 失敗・減点 | character1 | rain | なし | 1.15 |
| クライマックス | character1 | concentration_white | 1.0→1.2 | 1.3 |
| エンディング | character1 | sparkle | なし | なし |

### 実績テンプレート
- `assets/repro/lLBcGh4DZ8A/timeline.json` — 競技化彼氏（31ショット/42秒/1260f）
- レンダラー: `src/render-repro-v2.ts`
- コンポーネント: `src/remotion/compositions/ReproComposition.tsx`

## フリー素材の取得方法

### ニコニ・コモンズ（推奨）
- URL: https://commons.nicovideo.jp/
- **検索**: `https://commons.nicovideo.jp/search?keywords=検索ワード&materialType=1`（画像）
  - `materialType=1`=画像, `2`=音声, `4`=動画
  - URLパラメータは `q=` ではなく **`keywords=`** を使う（`q=`は効かない）
  - カテゴリ絞り込み: `&category=背景・壁紙` / `&category=立ち絵・キャラクター素材`
- **ダウンロード手順**: 素材ページ → 「ライセンスを確認してダウンロード」→ agreement ページでチェックボックスをクリック → ダウンロードボタン
- **ライセンス確認**: 「利用許可範囲: インターネット全般 or どこでも」「動画配信サイトでの収益化: OK」を必ず確認
- **保存先**: `assets/nicocommons/` にDL素材を配置

### 有用な検索キーワード例
| 用途 | 検索ワード |
|---|---|
| 男性立ち絵 | `立ち絵 男性 スーツ` (category: 立ち絵・キャラクター素材) |
| 女性立ち絵 | `女の子 立ち絵 表情差分` |
| キッチン背景 | `キッチン 背景素材` |
| 廊下背景 | `廊下 背景` |
| 寝室背景 | `寝室 背景` |
| リビング背景 | `リビング 背景` |

### 取得済み素材（assets/nicocommons/）
| ファイル | ニコニ・コモンズID | 用途 | ライセンス |
|---|---|---|---|
| `char_male_suit.png` | nc305597 | スーツ男性立ち絵 (2892×4093) | ネット全般/収益化OK |
| `char_female_girl.png` | nc453245 | 私服女の子立ち絵 (868×1771) | ネット全般/収益化OK |
| `bg_kitchen.png` | nc273115 | イラスト風キッチン背景 (1920×1080) | ネット全般/収益化OK |
| `bg_hallway.png` | nc393480 | 家の廊下・昼 (1920×1080) | ネット全般/収益化OK |
| `bg_bedroom.jpg` | nc391818 | 寝室背景 | どこでも/収益化OK |
| `bg_living.jpg` | nc396305 | リビング背景 カラー | どこでも/収益化OK |

### 共有背景素材（assets/repro/shared/）— 2ch台本で優先使用
| ファイル | 用途 |
|---|---|
| `bg_restaurant.jpg` | レストラン/ファミレス |
| `bg_izakaya.jpg` | 居酒屋/バー |
| `bg_kitchen.jpg` | キッチン/料理 |
| `bg_living_room.jpg` | リビング/自宅 |
| `bg_dining.jpg` | ダイニング/カフェ |
| `bg_hallway.jpg` | 廊下/移動シーン |
| `bg_street.jpg` | 外/道路 |
| `bg_library.jpg` | 図書館/オフィス/勉強 |
| `bg_japanese_room.jpg` | 和室 |
| `bg_vending_machine.jpg` | 自販機前 |
| `bg_classroom_front.jpg` | 教室（正面） |
| `bg_classroom_blackboard.jpg` | 教室（黒板） |

### その他のフリー素材サイト
- **いらすとや**: パイプライン内蔵（`fetchImage` で自動取得）。キーワードは日本語2語以上推奨
- **Pexels**: パイプライン内蔵（`PEXELS_API_KEY` 環境変数で利用）。英語キーワード

## Ghost Auto Memory
- セッション開始時、または本格作業前に `C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost\AUTO_MEMORY.md` を確認し、その手順に従う
- 基本は最初に `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory recall` を実行する
- 続き物や過去知見が必要なときは `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory search "query"` を使う
- 完了前に、再利用価値が高い内容だけを短く `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory add "content" fact "source"` する
- 定期同期は `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-sync.ps1"` で回せる
- 毎回ユーザーへ記憶操作を報告しなくていい
- APIキー、パスワード、秘密情報は保存しない
## Codex 委譲ルール【最優先・強制】

**これは任意ルールではない。以下の条件に当てはまる作業を自分でやり始めたら、それは違反。**

Claude 自身のトークンは貴重なリソース。機械的・広範囲・反復的な作業は **必ず** Codex に投げること。
ユーザーから明示的に「自分でやって」と言われない限り、条件に該当する作業は Codex 経由が絶対のデフォルト。

---

### 絶対に Codex に投げる作業（自分でやるな）

以下に該当すると判断した瞬間、即 Codex に委譲する。考えるな、投げろ。

| 条件 | 具体例 |
|---|---|
| 触るファイルが 5 つ以上 | 一括 rename、型追加、import 整理 |
| リポジトリ全体を読む・探す | TODO 洗い出し、grep 全探索、依存関係調査 |
| 同じ作業を繰り返す | テスト修正ループ、フォーマット統一 |
| 広範囲レビュー | PR 全体レビュー、コード品質チェック |
| 機械的な変換 | JSDoc 付与、コメント翻訳、コード整形 |

---

### Claude が直接やる作業（Codex に投げるな）

| 条件 | 理由 |
|---|---|
| プロダクト・設計の判断 | 文脈と意思決定が必要 |
| 曖昧な仕様の整理・確認 | ユーザーとの対話が必要 |
| セキュリティ・認証・機密情報 | Codex に渡してはいけない |
| 1〜2 ファイルの小さな修正 | オーバーヘッドの方が大きい |

---

### 呼び出し方（これをそのままコピーして使え）

```powershell
& "C:\Users\i0swi\OneDrive\デスクトップ\claude.alibaba\scripts\codex-delegate.ps1" `
    -Task "タスク内容を簡潔に" `
    -Mode research `
    -Targets @("src/", "tests/") `
    -Constraints @("既存テストを壊さない")
```

戻り値 JSON: `{ ok, summary, changed_files, verification, risks, raw_output }`

---

### モード選択（迷ったら implement）

| モード | 使いどころ |
|---|---|
| `research` | 調査・探索のみ（ファイル変更なし） |
| `implement` | 機能追加・修正 |
| `review` | コードレビュー |
| `refactor` | リファクタリング |
| `testfix` | テスト追加・修正 |

---

### 委譲フロー（このフローで動け）

```
タスク受け取り
  ↓
「5ファイル以上 or 全体探索 or 反復作業？」
  YES → 即 Codex に投げる → 結果を受け取る → ユーザーに報告
  NO  → 自分でやる
```

Codex の結果が `ok: false` だったときだけ、自分で対処を考える。
`ok: true` なら `summary` と `changed_files` をユーザーに伝えて終わり。


---

---
## Context Rot Prevention & Structured Handoff

### Context Rot検知
- ツール呼び出し30回超 or 同じファイルを3回以上編集 → コンテキストが腐り始めている
- 試行錯誤ループ（実行→失敗→微調整→実行）が3周したら立ち止まる
- 「もう1回だけ試す」は危険信号 → 現在地を要約してリセットを検討

### Structured Handoff手順
コンテキストが重くなったら:
1. 現在の作業状態を要約（何をした / 何が残ってる / ブロッカー）
2. 引き継ぎメモを作業ファイルに保存（mkmd --dir tmp --label handoff）
3. /clear でリセット
4. 新セッションで引き継ぎメモを読んで再開

### サブエージェント隔離原則
- サブエージェントへの指示はメインの文脈に依存させない（自己完結した指示を渡す）
- 反復ループ処理（バッチ生成・一括変換等）はメインから切り離して専用エージェントで回す
- メインセッションはオーケストレーションに徹する
---

<important>
## ハイブリッド委譲ルール【最優先・強制】

`/delegate-check` をプロンプト受信後、作業前に必ず実行。違反はユーザーが検知する。
詳細は `.claude/rules/delegation.md` を参照。

核心: Claudeは最高コスト資源。迷ったら委譲。自分でやるのは最終手段。
- Codex = 判断・相談（設計方針、レビュー）
- Gemini = 実作業・調査（3ファイル以上、repo横断、繰り返し、ウェブ調査）
- Claude直 = 2ファイル以下・5箇所以内・判断が主の小タスク
</important>


---
### Gemini 呼び出し方

```powershell
& "C:\Users\i0swi\OneDrive\デスクトップ\claude.alibaba\scripts\gemini-delegate.ps1" `
    -Task "タスク内容" `
    -Mode research `
    -Targets @("対象パス") `
    -Constraints @("制約")
```

戻り値 JSON: `{ ok, summary, changed_files, verification, risks, raw_output }`