import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://tdbfgpokanjfczynrevd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_O2P_zX02vxRf7Uuh1VM2cw_yIr5d7JX'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)