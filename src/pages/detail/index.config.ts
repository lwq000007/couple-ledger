export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '明细' })
  : { navigationBarTitleText: '明细' }
