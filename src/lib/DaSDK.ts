import { createSensor } from './create';
const sensors = createSensor('da-js-sdk');

const DEFAULT_SERVER_URL = 'https://dp-crystal.dustess.com/api/v1/event-collect/webCollect';
// 'https://dp-test-crystal.dustess.com/api/v1/event-collect/webCollect';

function getBrowserInfo() {
  const Sys = {
    browser: '',
    ver: '',
  };
  const ua = navigator.userAgent.toLowerCase();
  const re = /(msie|firefox|chrome|opera|version).*?([\d.]+)/;
  const m = ua.match(re);
  if (m) {
    Sys.browser = m[1]?.replace(/version/, "'safari");
    Sys.ver = m[2];
  }
  return Sys;
}
function getOsInfo() {
  const userAgent = navigator.userAgent.toLowerCase();
  let name = 'Unknown';
  let version = 'Unknown';
  if (userAgent.indexOf('win') > -1) {
    name = 'Windows';
    if (userAgent.indexOf('windows nt 5.0') > -1) {
      version = 'Windows 2000';
    } else if (
      userAgent.indexOf('windows nt 5.1') > -1 ||
      userAgent.indexOf('windows nt 5.2') > -1
    ) {
      version = 'Windows XP';
    } else if (userAgent.indexOf('windows nt 6.0') > -1) {
      version = 'Windows Vista';
    } else if (userAgent.indexOf('windows nt 6.1') > -1 || userAgent.indexOf('windows 7') > -1) {
      version = 'Windows 7';
    } else if (userAgent.indexOf('windows nt 6.2') > -1 || userAgent.indexOf('windows 8') > -1) {
      version = 'Windows 8';
    } else if (userAgent.indexOf('windows nt 6.3') > -1) {
      version = 'Windows 8.1';
    } else if (
      userAgent.indexOf('windows nt 6.2') > -1 ||
      userAgent.indexOf('windows nt 10.0') > -1
    ) {
      version = 'Windows 10';
    } else {
      version = 'Unknown';
    }
  } else if (userAgent.indexOf('iphone') > -1) {
    name = 'Iphone';
  } else if (userAgent.indexOf('mac') > -1) {
    name = 'Mac';
  } else if (
    userAgent.indexOf('x11') > -1 ||
    userAgent.indexOf('unix') > -1 ||
    userAgent.indexOf('sunname') > -1 ||
    userAgent.indexOf('bsd') > -1
  ) {
    name = 'Unix';
  } else if (userAgent.indexOf('linux') > -1) {
    if (userAgent.indexOf('android') > -1) {
      name = 'Android';
    } else {
      name = 'Linux';
    }
  } else {
    name = 'Unknown';
  }
  return { name, version };
}

const V = <T>(v: boolean, fn: () => T) => {
  if (!v) fn();
};

const validateConstructorProps = (options: DA_OPTIONS) => {
  V(!!options.source, () => {
    throw new Error('parameter required:source must not null');
  });
};

const validateLoginProps = (options: any) => {
  V(options.uid, () => {
    throw new Error('parameter required:uid must not null');
  });
  V(options.cid, () => {
    throw new Error('parameter required:cid must not null');
  });
};
const initSDK = ({
  server_url = DEFAULT_SERVER_URL,
  ...options
}: {
  server_url?: string;
  [key: string]: any;
}) => {
  sensors.init({
    server_url: server_url,
    is_track_single_page: false, // 单页面配置，默认开启，若页面中有锚点设计，需要将该配置删除，否则触发锚点会多触发 $pageview 事件
    use_client_time: true,
    // send_type: 'beacon',
    ...options,
    heatmap: {
      //是否开启点击图，default 表示开启，自动采集 $WebClick 事件，可以设置 'not_collect' 表示关闭。
      clickmap: 'not_collect',
      //是否开启触达注意力图，not_collect 表示关闭，不会自动采集 $WebStay 事件，可以设置 'default' 表示开启。
      scroll_notice_map: 'not_collect',
    },
  });
  return new Promise((resolve) => {
    sensors.quick('isReady', resolve);
  }).then(() => {
    console.log('getPresetProperties', sensors.getPresetProperties());
  });
};

const CACHE_TRACK_DATA_KEY = 'da-track-data';

const memory = function <T>(handler: () => T) {
  let res: T;
  return () => {
    return res || (res = handler());
  };
};

const getLocalData = (key: string) => {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_TRACK_DATA_KEY + key) as any);
  } catch (e) {
    return '';
  }
};

const initCommonProps = (options: DA_OPTIONS) => {
  const browser = getBrowserInfo();
  const os = getOsInfo();
  const commonProps = {
    $browser: browser.browser,
    $browser_version: browser.ver,
    $os: os.name,
    $os_version: os.version,
    $app_id: options.source,
    $time() {
      return Date.now();
    },
    $url_path() {
      try {
        return window.location.hash;
      } catch (e) {
        return '';
      }
    },
    $dp: memory(() => {
      try {
        return process.env.VUE_APP_MKCONFIG_ENV;
      } catch (e) {
        return '';
      }
    }),
  };
  if (!options.master) {
    Object.assign(commonProps, {
      $menu1: memory(getLocalData.bind(null, 'menu1')),
      $menu2: memory(getLocalData.bind(null, 'menu2')),
      $tab1: getLocalData.bind(null, 'tab'),
    });
  }
  sensors.registerPage(commonProps);
};

export interface DA_OPTIONS {
  source: string;
  master?: boolean;
  server_url?: string;
  name?: string;
}

export default class DaSDK {
  profile = {};
  constructor(options: DA_OPTIONS) {
    validateConstructorProps(options);
    initSDK(options);
    initCommonProps(options);
  }
  login(options: { uid: string; cid: string; name?: string }) {
    validateLoginProps(options);
    this.registerPage({
      $uid: options.uid,
      $company_id: options.cid,
    });
    if (options.name) {
      this.registerPage({
        $user_name: options.name,
      });
    }
    sensors.login(options.uid + '|' + options.cid);
  }
  setProfile(options: Record<string, any>) {
    sensors.setProfile(options);
  }
  deleteProfile(key: string) {
    sensors.unsetProfile(key as any);
  }
  clearProfile() {
    Object.keys(this.profile).forEach(this.deleteProfile);
  }
  registerPage(options: Record<string, any>) {
    Object.assign(this.profile, options);
    sensors.registerPage(options);
  }
  track(eventName: string, data: Record<string, any>) {
    sensors.track(eventName, data);
  }
  set(key: string, value: any) {
    window.localStorage.setItem(CACHE_TRACK_DATA_KEY + key, JSON.stringify(value));
  }
}
