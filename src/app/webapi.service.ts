import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ConfigService } from './config.service';
import { GrinotesAuthService } from './grinotes-auth.service';

declare var AWS;

@Injectable()
export class WebapiService {

    inProgress = false;

    constructor(
        private http: HttpClient,
        private configService: ConfigService,
        private authService: GrinotesAuthService
    ) { }

    run(awsLambdaName:string, params = {}, callbackFn = undefined) {
        if (!this.authService.isAWSLoggedIn) {
            setTimeout(_ => {
                this.run(awsLambdaName, params, callbackFn);
            }, 500);
            return
        }

        this.inProgress = true;
        let lambdaParams = {
            FunctionName: awsLambdaName,
            Payload: JSON.stringify({
                ...params,
                fbid: this.authService.user.id
            })
        };
        let lambda = new AWS.Lambda();
        let that = this;
        lambda.invoke(lambdaParams, (err, data) => {
            this.inProgress = false;

            if (err) {
                console.error('err', err);
                return;
            }

            let response = data && data['Payload'] ? JSON.parse(data['Payload']) : {};
            if (response['result'] != 'ok') {
                if (response['error']) {
                    console.error('error', response['error']);
                }
            }

            if (callbackFn) {
                callbackFn(response);
            }
        });
    }

    // GET requests
    get(url, params = {}, callbackFn = undefined) {
        this.inProgress = true;

        // add authentication token
        if (this.authService.isLoggedIn && this.authService.accessToken) {
            params['access_token'] = this.authService.accessToken;
        }

        // prepare the URL
        const requestUrl = this.configService.API_BASE_URL + url + '.php';

        // make the request
        let promise = this.http.get(requestUrl, { params }).toPromise();

        promise.then(res => this.inProgress = false)

        // check callback
        if (callbackFn) {
            promise.then(callbackFn);
        }

        return promise;
    }

    // POST requests
    post(url, params = {}, callbackFn = undefined) {
        this.inProgress = true;

        // add authentication token
        if (this.authService.isLoggedIn && this.authService.accessToken) {
            params['access_token'] = this.authService.accessToken;
        }

        // prepare the URL
        const requestUrl = this.configService.API_BASE_URL + url + '.php';

        // prepare request parameters
        let requestParams = new HttpParams({
            fromObject: params
        });

        // set request as form submit
        const requestOptions = {
            headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
        };

        // perform the request
        let promise = this.http.post(requestUrl, requestParams.toString(), requestOptions).toPromise();

        promise.then(res => this.inProgress = false)

        // check callback
        if (callbackFn) {
            promise.then(callbackFn);
        }

        return promise;
    }
}
