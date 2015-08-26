
type imap$ImapOpts = {
  user?:        string,
  password?:    string,
  xoauth?:      string,
  xoauth2?:     string,
  host?:        string,
  port?:        number,
  tls?:         boolean,
  tlsOptions?:  Object,
  autotls?:     'always' | 'required' | 'never',
  connTimeout?: number,
  authTimeout?: number,
  keepalive?:   boolean | { interval?: number, idleInterval?: number, forceNoop?: boolean },
  debug?:       (info: string) => void,
}

type imap$Namespace = {
  prefix:    string,
  delimiter: ?string,
  extensions: ?Array<{ name: 'string', params: ?Array<string> }>,
}

type imap$Headers = { [key:string]: string[] }

 type imap$Box = {
  name:           string,
  readyOnly?:     boolean,  // only available with openBox() calls
  newKeywords:    boolean,
  uidvalidity:    number,
  uidnext:        number,
  flags:          imap$Flag[],
  permFlags:      imap$Flag[],
  persistentUIDs: boolean,
  messages: {
    total:   number,
    new:     number,
    unseen?: number,  // only available with status() calls
  }
}

type imap$Boxes = { [key:string]: {
  attribs:   string[],
  delimiter: string,
  children:  ?imap$Boxes,
  parent:    ?Object,
} }

declare module "imap" {
  declare class Imap extends events$EventEmitter {
    state:     string;  // eg. 'disconnected', 'connected', 'authenticated'
    delimiter: ?string; // folder hierarchy delimiter
    namespaces: {
      personal: imap$Namespace[],
      other:    imap$Namespace[],
      shared:   imap$Namespace[],
    };
    static parseHeader(rawHeader: string, disableAutoDecode?: boolean): imap$Headers;
    constructor(opts?: imap$ImapOpts): void;
    connect(): void;
    end(): void;
    destroy(): void;
    openBox(mailboxName: string, openReadOnly?: boolean, modifiers: Object,
            cb: (err: Error, mailbox: imap$Box) => void): void;
    closeBox(autoExpunge?: boolean, cb: (err: Error) => void): void;
    addBox(mailboxName: string, cb: (err: Error) => void): void;
    delBox(mailboxName: string, cb: (err: Error) => void): void;
    renameBox(oldName: string, newName: string, cb: (err: Error, box: Box) => void): void;
    subscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    unsubscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    status(mailboxName: string, cb: (err: Error, box: imap$Box) => void): void;
    getBoxes(nsPrefix?: string, cb: (err: Error, boxes: imap$Boxes) => void): void;
    getSubscribedBoxes(nsPrefix?: string, cb: (err: Error, boxes: imap$Boxes) => void): void;
  }
  // Imap events:
  // - 'ready' : ()
  // - 'alert' : (message: string)
  // - 'mail'  : (numNewMsgs: number)
  // - 'expunge' : (seqno: number)
  // - 'uidvalidity' : (uidvalidity: number)
  // - 'update' : (seqno: number, info: Object)
  // - 'error' : (err: Error & { source: string })
  // - 'close' : (hadError: boolean)
  // - 'end' : ()
}
