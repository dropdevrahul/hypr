export namespace main {
	
	export class Request {
	    method: string;
	    url: string;
	    headers: {[key: string]: string};
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
	    }
	}

}

