// Nitro サーバ側の Supabase クライアント取得（api.md §2・ops.md）。
// - serverSupabaseClient: 呼び出しユーザーのJWTを引き継いだクライアント（RLS適用）。集計の既定。
// - serverSupabaseServiceRole: RLSバイパス（サーバ専用・原則使わない）。
// - serverSupabaseUser: 検証済みユーザー。
// ※ Nitro の auto-import 生成が壊れるため、下の re-export 中括弧内にはコメントを書かない。
export { serverSupabaseClient, serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
