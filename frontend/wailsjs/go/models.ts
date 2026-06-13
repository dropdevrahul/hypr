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
	export class RequestSpec {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: main.BodySpec;
	    settings: main.RequestSettings;

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

	    convertValues(a: any, classs: any): any {
	        if (!a) {
	            return a;
	        }
	        return new classs(a);
	    }
	}

}

