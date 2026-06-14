export namespace main {
	
	export class BodySpec {
	    type: string;
	    raw: string;
	
	    static createFrom(source: any = {}) {
	        return new BodySpec(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.raw = source["raw"];
	    }
	}
	export class RequestResult {
	    Method: string;
	    URL: string;
	    ReqHeaders: string;
	    RequestBody: string;
	    Body: string;
	    HeadersStr: string;
	    Error: string;
	    Status: number;
	    StatusText: string;
	    DurationMs: number;
	    SizeBytes: number;
	
	    static createFrom(source: any = {}) {
	        return new RequestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Method = source["Method"];
	        this.URL = source["URL"];
	        this.ReqHeaders = source["ReqHeaders"];
	        this.RequestBody = source["RequestBody"];
	        this.Body = source["Body"];
	        this.HeadersStr = source["HeadersStr"];
	        this.Error = source["Error"];
	        this.Status = source["Status"];
	        this.StatusText = source["StatusText"];
	        this.DurationMs = source["DurationMs"];
	        this.SizeBytes = source["SizeBytes"];
	    }
	}
	export class KVPair {
	    Key: string;
	    Value: string;
	
	    static createFrom(source: any = {}) {
	        return new KVPair(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Key = source["Key"];
	        this.Value = source["Value"];
	    }
	}
	export class Payload {
	    headers: KVPair[];
	    params: KVPair[];
	    bodyType: string;
	    jsonBody: string;
	    rawBody: string;
	    formRows: KVPair[];
	    response?: RequestResult;
	
	    static createFrom(source: any = {}) {
	        return new Payload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.headers = this.convertValues(source["headers"], KVPair);
	        this.params = this.convertValues(source["params"], KVPair);
	        this.bodyType = source["bodyType"];
	        this.jsonBody = source["jsonBody"];
	        this.rawBody = source["rawBody"];
	        this.formRows = this.convertValues(source["formRows"], KVPair);
	        this.response = this.convertValues(source["response"], RequestResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RequestSettings {
	    timeoutMs: number;
	    followRedirects: boolean;
	    verifyTLS: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeoutMs = source["timeoutMs"];
	        this.followRedirects = source["followRedirects"];
	        this.verifyTLS = source["verifyTLS"];
	    }
	}
	export class StoredAuth {
	    type: string;
	    token: string;
	    user: string;
	    pass: string;
	    apiKeyName: string;
	    apiKeyValue: string;
	    apiKeyTarget: string;
	
	    static createFrom(source: any = {}) {
	        return new StoredAuth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.token = source["token"];
	        this.user = source["user"];
	        this.pass = source["pass"];
	        this.apiKeyName = source["apiKeyName"];
	        this.apiKeyValue = source["apiKeyValue"];
	        this.apiKeyTarget = source["apiKeyTarget"];
	    }
	}
	export class SavedRequest {
	    id: string;
	    name: string;
	    method: string;
	    url: string;
	    auth: StoredAuth;
	    settings: RequestSettings;
	    payloads: Payload[];
	    activePayload: number;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SavedRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.auth = this.convertValues(source["auth"], StoredAuth);
	        this.settings = this.convertValues(source["settings"], RequestSettings);
	        this.payloads = this.convertValues(source["payloads"], Payload);
	        this.activePayload = source["activePayload"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Collection {
	    id: string;
	    name: string;
	    requests: SavedRequest[];
	
	    static createFrom(source: any = {}) {
	        return new Collection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.requests = this.convertValues(source["requests"], SavedRequest);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryEntry {
	    id: string;
	    method: string;
	    url: string;
	    status: number;
	    statusText: string;
	    durationMs: number;
	    sentAt: string;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.status = source["status"];
	        this.statusText = source["statusText"];
	        this.durationMs = source["durationMs"];
	        this.sentAt = source["sentAt"];
	    }
	}
	
	
	export class Request {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	
	    static createFrom(source: any = {}) {
	        return new Request(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	    }
	}
	
	
	export class RequestSpec {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: BodySpec;
	    settings: RequestSettings;
	
	    static createFrom(source: any = {}) {
	        return new RequestSpec(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = this.convertValues(source["body"], BodySpec);
	        this.settings = this.convertValues(source["settings"], RequestSettings);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class TabState {
	    savedId: string;
	    method: string;
	    url: string;
	    auth: StoredAuth;
	    settings: RequestSettings;
	    payloads: Payload[];
	    activePayload: number;
	
	    static createFrom(source: any = {}) {
	        return new TabState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.savedId = source["savedId"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.auth = this.convertValues(source["auth"], StoredAuth);
	        this.settings = this.convertValues(source["settings"], RequestSettings);
	        this.payloads = this.convertValues(source["payloads"], Payload);
	        this.activePayload = source["activePayload"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Session {
	    openRequests: TabState[];
	    activeRequest: number;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.openRequests = this.convertValues(source["openRequests"], TabState);
	        this.activeRequest = source["activeRequest"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

