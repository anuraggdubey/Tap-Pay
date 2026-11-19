import React, {useEffect, useRef, useState} from 'react';

type TurnstileApi = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  remove: (id: string) => void;
};

const turnstileWindow = () => window as Window & {turnstile?: TurnstileApi};
let loading: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  const existing = turnstileWindow().turnstile;
  if (existing) {
    return Promise.resolve(existing);
  }
  if (!loading) {
    loading = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        const api = turnstileWindow().turnstile;
        if (api) {
          resolve(api);
        } else {
          reject(new Error('Verification unavailable'));
        }
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Verification unavailable'));
      };
      document.head.appendChild(script);
    }).catch(error => {
      loading = undefined;
      throw error;
    });
  }
  return loading;
}

export function Turnstile({siteKey, onToken}: {siteKey: string; onToken: (token: string) => void}) {
  const element = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let widget: string | undefined;
    let api: TurnstileApi | undefined;
    const clear = () => onToken('');
    loadTurnstile().then(loaded => {
      if (disposed || !element.current) {
        return;
      }
      api = loaded;
      widget = api.render(element.current, {
        sitekey: siteKey,
        action: 'waitlist-signup',
        callback: token => {
          setFailed(false);
          onToken(token);
        },
        'expired-callback': clear,
        'error-callback': () => {
          clear();
          setFailed(true);
        },
      });
    }).catch(() => {
      if (!disposed) {
        clear();
        setFailed(true);
      }
    });
    return () => {
      disposed = true;
      if (widget !== undefined) {
        api?.remove(widget);
      }
    };
  }, [siteKey, onToken]);
  return (
    <div>
      <div ref={element} />
      {failed && <p role="alert">Verification unavailable. Please reload and try again.</p>}
    </div>
  );
}
