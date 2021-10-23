import DaSDK from './DaSDK';

const getRouter = (params: DA_PLUGIN_OPTION) => {
  const router: DA_PLUGIN_OPTION['router'] = params?.router || {};
  let result: any = {
    router: false,
  };
  if (typeof router === 'boolean') {
    result = {
      router: router,
    };
  } else {
    if (typeof router.data !== 'function') {
      const data = router.data || {};
      result.data = () => data;
    }
  }
  return Object.assign(
    {
      router: true,
      event: 'webView',
      data() {
        return {};
      },
    },
    result
  );
};

const initVueRouter = (router: any, config: ReturnType<typeof getRouter>, sa: DaSDK) => {
  if (config.router && router) {
    router.afterEach(function name(to: any) {
      sa.track(config.event, {
        name: to.name,
        router: to.path,
      });
    });
  }
};

const TRACK_NODE_KEY = Symbol('track_node');
const setTrackNode = (ele: any, value: any) => {
  ele[TRACK_NODE_KEY] = value;
};
const getTrackNode = (ele: any): any => {
  return ele[TRACK_NODE_KEY];
};

const getPathByContext = (ele: any, path: any[] = []): any[] => {
  if (!ele) return path;
  if (getTrackNode(ele)) {
    path.unshift(getTrackNode(ele));
  }
  return getPathByContext(ele.parentElement, path);
};

const getDirectiveProps = (binding: any, defaultEvent: string) => {
  const events = Object.keys(binding.modifiers || {});
  const event = events[0] || defaultEvent;
  const data =
    typeof binding.value === 'function'
      ? (data?: Record<string, any>) => Object.assign({}, binding.value() || {}, data || {})
      : (data?: Record<string, any>) => Object.assign({}, binding.value || {}, data || {});
  return { event, data };
};

const getDirectiveInserted = (
  defaultEvent: string,
  sa: DaSDK | (() => DaSDK),
  handler: (track: () => void, data: { el: HTMLElement; binding: any; node: any }) => void
): ((el: HTMLElement, binding: any, node: any) => void) => {
  return function (el, binding, node) {
    const { event, data } = getDirectiveProps(binding, defaultEvent);
    handler(
      () => {
        const path = getPathByContext(el);
        const trackData = data({ path });
        if (node.context) {
          node.context.$track(event, trackData, false);
        } else {
          sa = typeof sa === 'function' ? sa() : sa;
          if (!sa) return;
          sa.track(event, trackData);
        }
      },
      { el, binding, node }
    );
  };
};

export interface DA_PLUGIN_OPTION {
  router:
    | boolean
    | {
        event?: string;
        data?: Record<string, any> | (() => Record<string, any>);
      };
}

export const install = (_Vue: any, params: DA_PLUGIN_OPTION) => {
  if (_Vue.daInstalled) return;
  _Vue.daInstalled = true;

  let sa: DaSDK;
  const routerConfig = getRouter(params);
  _Vue.mixin({
    created() {
      if (this.$options.sa) {
        sa = this.$options.sa;
        const router = this.$options.router;
        router && initVueRouter(router, routerConfig, sa);
      }
    },
  });
  _Vue.directive('track-leave', {
    inserted: getDirectiveInserted(
      'viewLeave',
      () => sa,
      (track) => track()
    ),
  });
  _Vue.directive('track-enter', {
    inserted: getDirectiveInserted(
      'viewEnter',
      () => sa,
      (track) => track()
    ),
  });
  _Vue.directive('track-stay', {
    inserted: getDirectiveInserted(
      'viewStay',
      () => sa,
      (track, { el }) => {
        (el as any).__track__stay__timer = setTimeout(() => {
          track();
        }, 5000);
      }
    ),
    unbind(el: any) {
      clearTimeout(el.__track__stay__timer);
    },
  });
  _Vue.directive('track-click', {
    inserted: getDirectiveInserted(
      'viewClick',
      () => sa,
      (track, { el }) => {
        el.addEventListener('click', ((el as any).__track__click__handler = track));
      }
    ),
    unbind(el: any) {
      el.removeEventListener('click', el.__track__click__handler);
      el.__track__click__handler = null;
    },
  });
  _Vue.directive('track-node', {
    inserted(el: HTMLElement, binding: any) {
      setTrackNode(el, binding.value);
    },
  });
  //@desc 此处先支撑系统级的第一层级,待需求整理后再
  _Vue.directive('track-tab', {
    inserted(_el: HTMLElement, binding: any) {
      sa.set('tab', binding.value);
    },
  });
  _Vue.prototype.$track = function (
    eventName: string,
    data?: Record<string, any>,
    mergePath = true
  ) {
    data = data || {};
    if (mergePath || !data.path) {
      data.path = data.path || [];
      data.path.unshift(...getPathByContext(this.$el));
    }
    sa.track(eventName, data);
  };
  //@desc 以下代码为一期处理1级菜单和二级菜单准备 待主/子应用完完善后再行切换处理机制
  _Vue.prototype.$$setMenu = function name(menu1: any, menu2: any) {
    sa.set('menu1', menu1);
    sa.set('menu2', menu2);
  };
};
