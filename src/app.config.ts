export default typeof defineAppConfig === 'function'
  ? defineAppConfig({
    pages: [
      'pages/index/index',
      'pages/detail/index',
      'pages/couple/index',
      'pages/profile/index',
    ],
    tabBar: {
      color: '#BCAAA4',
      selectedColor: '#FF6B6B',
      backgroundColor: '#ffffff',
      borderStyle: 'white',
      list: [
        {
          pagePath: 'pages/index/index',
          text: '账本',
          iconPath: './assets/tabbar/book-open.png',
          selectedIconPath: './assets/tabbar/book-open-active.png',
        },
        {
          pagePath: 'pages/detail/index',
          text: '明细',
          iconPath: './assets/tabbar/clipboard-list.png',
          selectedIconPath: './assets/tabbar/clipboard-list-active.png',
        },
        {
          pagePath: 'pages/index/index',
          text: '记一笔',
          iconPath: './assets/tabbar/plus.png',
          selectedIconPath: './assets/tabbar/plus-active.png',
        },
        {
          pagePath: 'pages/couple/index',
          text: '情侣空间',
          iconPath: './assets/tabbar/heart.png',
          selectedIconPath: './assets/tabbar/heart-active.png',
        },
        {
          pagePath: 'pages/profile/index',
          text: '我的',
          iconPath: './assets/tabbar/user.png',
          selectedIconPath: './assets/tabbar/user-active.png',
        },
      ],
    },
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#FFF9F5',
      navigationBarTitleText: '俩个人的账本',
      navigationBarTextStyle: 'black',
      backgroundColor: '#FFF9F5',
    },
  })
  : {
    pages: [
      'pages/index/index',
      'pages/detail/index',
      'pages/couple/index',
      'pages/profile/index',
    ],
    tabBar: {
      color: '#BCAAA4',
      selectedColor: '#FF6B6B',
      backgroundColor: '#ffffff',
      borderStyle: 'white',
      list: [
        {
          pagePath: 'pages/index/index',
          text: '账本',
          iconPath: './assets/tabbar/book-open.png',
          selectedIconPath: './assets/tabbar/book-open-active.png',
        },
        {
          pagePath: 'pages/detail/index',
          text: '明细',
          iconPath: './assets/tabbar/clipboard-list.png',
          selectedIconPath: './assets/tabbar/clipboard-list-active.png',
        },
        {
          pagePath: 'pages/index/index',
          text: '记一笔',
          iconPath: './assets/tabbar/plus.png',
          selectedIconPath: './assets/tabbar/plus-active.png',
        },
        {
          pagePath: 'pages/couple/index',
          text: '情侣空间',
          iconPath: './assets/tabbar/heart.png',
          selectedIconPath: './assets/tabbar/heart-active.png',
        },
        {
          pagePath: 'pages/profile/index',
          text: '我的',
          iconPath: './assets/tabbar/user.png',
          selectedIconPath: './assets/tabbar/user-active.png',
        },
      ],
    },
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#FFF9F5',
      navigationBarTitleText: '俩个人的账本',
      navigationBarTextStyle: 'black',
      backgroundColor: '#FFF9F5',
    },
  }
