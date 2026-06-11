### 今後やりたいこと
- [難易度: 中] サプリの接種もカレンダー化したい
- [難易度: 中] 場所の概念を追加したい、workoutに対して1:1で紐づく、とりあえず場所名だけ入力できるように。過去に使った場所名を頻出順で選択できると嬉しい
- [難易度: 低, 優先度: 低] export機能が欲しい 

### 完了
- [x] [難易度: 中] もっさり対策④日別の即時描画 — カレンダー月一括取得の entries/places を共有キャッシュ（`useDayCache`）に流し込み、日別ページは初期表示に再利用→裏で `/api/day` を refresh。カレンダーからの遷移が即描画に（未キャッシュ日は従来fetch）。entries はカレンダーAPIと `/api/day` で同一値（検証済）
- [x] [難易度: 小] セット入力時のトースト通知 — 追加/更新/削除の成否を画面下に短時間表示（入力できたかの分かりやすさ向上）。`useToast` ＋ `ui/ToastHost`（default レイアウト常設）を新設。エラーも同トーストに統一
- [x] [難易度: 小] もっさり対策③マスタの重複ロード抑止 — `useExerciseMaster.load()` をセッション内ロード済みならスキップ（CRUD は `load(true)` で強制更新、ユーザー変化でキャッシュ破棄）。exercises/dashboard を開くたびの3クエリ再取得を削減
- [x] [難易度: 中] もっさり対策②ダッシュボードAPI集約 — `/api/dashboard/{volume,max-weight,est-1rm,overloaded}` の4往復を `/api/dashboard/summary` 1本に集約（サーバ内 Promise.all）。ブラウザ↔サーバ往復とSupabase接続数を削減。既存4本は他用途で残置。リグレッションで個別4本と同値を実証
- [x] [難易度: 中] もっさり対策①カレンダー一括プリフェッチ — `/api/calendar/[month]` をドット＋その月の全日メニュー＋場所を1回返すよう拡張（`CalendarMonthResponse`）。日付タップ時の `/api/day` 往復を廃し、クライアントキャッシュで即時表示。無料Supabaseのレイテンシ対策
- [x] [難易度: 中] カレンダーの2段タップ — 日付を1回タップでその日のメニュー（種目・セット数・サマリ）をカレンダー下にインライン表示、同じ日の再タップ/行/「詳細 ›」で日別へ。月送りで選択解除。`CalendarDayPreview` 新設・既存 `/api/day` 再利用（バックエンド変更なし）
- [x] [難易度: 低] セット入力時刻の表示 — SetRowに🕒HH:MM（JST）。直近セットの判別用
- [x] [難易度: 低] セット追加でグラフ連動 — 追加/編集/削除後に筋ボリューム/トップセット推移を refresh
- [x] [難易度: 低] 前回記録テキストから前回セットへ遷移 — LastRecordBadgeをリンク化（last APIに workoutExerciseId 追加）
- [x] [難易度: 中] エクササイズ詳細画面のレイアウト変更 — 前回比較バッジ→セット表→セット追加→メモ→筋ボリューム推移→トップセット推移。種目別ボリューム推移エンドポイント新設
- [x] [難易度: 中] 有酸素は「分のみ」記録 — body_part.name='有酸素'で判定。weight/reps=null＋duration_sec、集計は重量系から除外。入力UIを分ステッパーに出し分け
- [x] [難易度: 中] 自重は「回数のみ」記録 — training_method.name='自重'で判定。weight=null＋reps（duration_sec=null）。表示/集計は `weight is null and reps is not null` で識別。`mode_check` に回数のみモードを追加、`v_exercise_max_reps`／`fn_add_bodyweight_set` 新設、入力UIを回数ステッパーに出し分け、グラフは「最大回数の推移」を表示（前回比較バッジは現状非表示・known-issues §2）
- [x] [難易度: 小] DBデータ取得中のローディング表示 — 共通スピナー＋取得をlazy化。カレンダー/ダッシュボード等で取得中に空状態を早出ししないよう修正
- [x] [難易度: 中] ダークモードカラーの追加 — CSS変数テーマ＋トグル＋OS既定＋永続化（FOUC防止）
- [x] [難易度: 小] faviconの設定 — バーベル風SVG favicon
- [x] [難易度: 小] アプリ名を決める — **PROGRE**（progressive overload 由来）
