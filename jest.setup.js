// 模拟 DOM 环境
Object.defineProperty(window, 'DOMParser', {
  writable: true,
  value: jest.fn(() => ({
    parseFromString: jest.fn()
  }))
});

// 模拟 chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
}; 