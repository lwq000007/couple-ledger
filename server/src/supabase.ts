import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://tdbfgpokanjfczynrevd.supabase.co'
const supabaseKey = process.env.SUPABASE_SECRET_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)
