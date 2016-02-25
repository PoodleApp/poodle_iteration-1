
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

// type imap$Box = {
//   name:           string,
//   readyOnly?:     boolean,  // only available with openBox() calls
//   newKeywords:    boolean,
//   uidvalidity:    number,
//   uidnext:        number,
//   flags:          imap$Flag[],
//   permFlags:      imap$Flag[],
//   persistentUIDs: boolean,
//   messages: {
//     total:   number,
//     new:     number,
//     unseen?: number,  // only available with status() calls
//   }
// }

type imap$Box = {
  attribs:   string[],
  delimiter: string,
  children:  ?imap$Boxes,
  parent:    ?Object,
}

type imap$Boxes = { [key:string]: imap$Box }

type imap$MessagePart = {
  partID?:      string,
  type:         string,  // eg, 'text'
  subtype?:     string,  // eg, 'plain'
  params:       { [key:string]: string },  // eg, charset
  encoding?:    string,
  id?:          ?string,
  description?: ?string,
  disposition?: ?string,
  language?:    ?string,
  location?:    ?string,
  md5?:         ?string,
  size?:        number,
  lines?:       number,
}

// Should be: type imap$MessageTree = [imap$MessagePart, ...imap$MessageTree]
type imap$MessageTree = imap$MessagePart | imap$MessageTree[]

type imap$Flag = '\\Seen'
               | '\\Answered'
               | '\\Flagged'
               | '\\Deleted'
               | '\\Draft'

type imap$FetchOptions = {
  markSeen?:  boolean,
  struct?:    boolean,  // fetch message structure
  envelope?:  boolean,
  size?:      boolean,
  modifiers?: { [key:string]: string },  // modifiers defined by IMAP extensions
  bodies?:    string | string[],  // e.g., 'HEADER.FIELDS (FROM SUBJECT TO DATE)'
}

type imap$MessageSource = string | string[]
type imap$UID = string

declare class imap$ImapFetch extends events$EventEmitter {}
// ImapFetch events:
// - 'message' : (msg: ImapMessage, seqno: number)
// - 'error'   : (err: Error)
// - 'end'     : ()

declare class imap$ImapMessage extends events$EventEmitter {}
// ImapMessage events:
// - 'body' : (stream: ReadableStream, info: { which: string, size: number })
// - 'attributes' : (attrs: imap$MessageAttributes)
//
// `which` corresponds to single `bodies` element in imap$FetchOptions

type imap$MessageAttributes = {
  uid:    number,
  flags:  imap$Flag[],
  date:   Date,
  struct: imap$MessageTree,
  size:   number,
  'x-gm-labels'?: string[],
  'x-gm-thrid'?:  string,
  'x-gm-msgid'?:  string,
}

declare class imap$ConnectionSeq {
  fetch(source: imap$MessageSource, opts?: imap$FetchOptions): imap$ImapFetch;
}

declare module "imap" {

  declare class Connection extends events$EventEmitter {
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
    openBox(mailboxName: string, openReadOnly?: boolean, modifiers?: Object,
            cb: (err: Error, mailbox: imap$Box) => void): void;
    openBox(mailboxName: string, openReadOnly?: boolean,
            cb: (err: Error, mailbox: imap$Box) => void): void;
    openBox(mailboxName: string,
            cb: (err: Error, mailbox: imap$Box) => void): void;
    closeBox(autoExpunge?: boolean, cb: (err: Error) => void): void;
    addBox(mailboxName: string, cb: (err: Error) => void): void;
    delBox(mailboxName: string, cb: (err: Error) => void): void;
    renameBox(oldName: string, newName: string, cb: (err: Error, box: imap$Box) => void): void;
    subscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    unsubscribeBox(mailboxName: string, cb: (err: Error) => void): void;
    status(mailboxName: string, cb: (err: Error, box: imap$Box) => void): void;
    getBoxes(nsPrefix: string, cb: (err: Error, boxes: imap$Boxes) => void): void;
    getBoxes(cb: (err: Error, boxes: imap$Boxes) => void): void;
    getSubscribedBoxes(nsPrefix?: string, cb: (err: Error, boxes: imap$Boxes) => void): void;

    search(criteria: any[], cb: (err: Error, uids: imap$UID[]) => any): void;

    // All of these methods have sequence-based counterparts. Those are declared
    // in `imap$ConnectionSeq`.
    seq: imap$ConnectionSeq;
    fetch(source: imap$MessageSource, opts?: imap$FetchOptions): imap$ImapFetch;
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

  declare var exports: typeof Connection

  declare type Box               = imap$Box
  declare type ImapMessage       = imap$ImapMessage
  declare type ImapOpts          = imap$ImapOpts
  declare type MessageAttributes = imap$MessageAttributes
}
