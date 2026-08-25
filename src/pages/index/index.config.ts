export default typeof definePageConfig === 'function'
  ? definePageConfig({
    navigationBarTitleText: '俩个人的账本',
    navigationBarBackgroundColor: '#FFF9F5',
  })
  : { navigationBarTitleText: '俩个人的账本', navigationBarBackgroundColor: '#FFF9F5' }
