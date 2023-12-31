//### return types ###

type Ok<T> = { isOk: true, val: T};
type Err<E> = { isOk: false, err: E};

function Ok<T>(val: T): Ok<T> {
    return { isOk: true, val};
}
function Err<E>(err: E): Err<E> {
    return { isOk: false, err};
}


//### db types ###

export type sqlite_value = sqlite_text|sqlite_integer|sqlite_integer|sqlite_real|sqlite_blob|sqlite_null;
export type sqlite_text = string; //a UTF-8 encoded string
export type sqlite_integer = number; //a 64-bit signed integer
export type sqlite_real = number; //a 64-bits floating number
export type sqlite_blob = string; //some binary data, encoded in base64
export type sqlite_null = null; //the null value

export type sqlite_query = string | { q: string, params: Record<string, sqlite_value> | Array<sqlite_value> };

type _QueryResponse = {
    results: {
        columns: Array<string>,
        rows: Array<Array<sqlite_value>>,
    }
}

type _ErrorResponse = {
    error: string
}

type _LibError = {
    server_status_code: number,
    server_status_text: string,
    error: string,
    server_response: any
}



//### function ###

/** Execute a batch of SQL statements. */
export async function executeBatch(
    config: {
        /** The database URL.
         *
         * The client supports `http:`/`https:` URL.
         * 
         */
        url: string,

        /** Authentication token for the database. */
        authToken?: string
    },
    statements: Array<sqlite_query>
): Promise<Ok<Array<_QueryResponse|_ErrorResponse|null>>|Err<_LibError>> {
    const res = await fetch(config.url, {
        method: 'POST',
        headers: (!config.authToken)?undefined:{'Authorization': 'Bearer '+config.authToken},
        body: JSON.stringify({statements})
    });
    if (res.ok) return Ok(await res.json() as Array<_QueryResponse|_ErrorResponse|null>);
    else return Err({
        server_status_code: res.status,
        server_status_text: res.statusText,
        error: "Bad response.",
        server_response: res.body
    });
}

export function extractBatchQueryResultRows(ok_result: Ok<Array<_QueryResponse|_ErrorResponse|null>>): Array<Array<Array<sqlite_value>>|null> {
    return ok_result.val.map(e => {
        if (
            !e ||
            (e as _ErrorResponse|null)?.error
        ) return null;
        else return (e as _QueryResponse).results.rows;
    });
}

/** Execute an SQL statements. */
export async function execute(
    config: {
        /** The database URL.
         *
         * The client supports `http:`/`https:` URL.
         * 
         */
        url: string,

        /** Authentication token for the database. */
        authToken?: string
    },
    statement: sqlite_query
): Promise<Ok<_QueryResponse|_ErrorResponse|null>|Err<_LibError>> {
    const res = await executeBatch(config, [statement]);
    if (res.isOk) return Ok(res.val[0]);
    else return Err(res.err);
}

export function extractQueryResultRows(ok_result: Ok<_QueryResponse|_ErrorResponse|null>): Array<Array<sqlite_value>>|null {
    if (
        !ok_result.val ||
        (ok_result.val as _ErrorResponse|null)?.error
    ) return null;
    else return (ok_result.val as _QueryResponse).results.rows;
}


/** Check if the server is compatible with sqld http API v0 */
export async function checkServerCompat(config: {
    /** The database URL.
     *
     * The client supports `http:`/`https:` URL.
     * 
     */
    url: string,

    /** Authentication token for the database. */
    authToken?: string
}): Promise<Ok<undefined>|Err<undefined>> {
    const res = await execute(config, "");
    if (
        res.isOk &&
        extractQueryResultRows(res)===null
    ) return Ok(undefined);
    else return Err(undefined);
}