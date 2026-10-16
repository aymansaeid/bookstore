/** RFC 7807 body (API guide §2). `title` is a stable machine code. */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
  requestId?: string;
}

interface ApiErrorInit {
  status: number;
  code: string;
  requestId: string | null;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  detail?: string | undefined;
}

/**
 * Every failed API call throws this. `code` is the ProblemDetails title, or
 * one of: Validation, RateLimited, Network, Http{status}.
 * `detail` is English and for developers only. Never show it to customers.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly detail: string | undefined;

  constructor(init: ApiErrorInit) {
    super(`${init.status} ${init.code}`);
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.fieldErrors = init.fieldErrors ?? {};
    this.detail = init.detail;
  }

  static network(): ApiError {
    return new ApiError({ status: 0, code: 'Network', requestId: null });
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const problem = await readProblem(response);
    const fieldErrors = problem?.errors ?? {};
    let code: string;
    if (response.status === 429) code = 'RateLimited';
    else if (response.status === 400 && Object.keys(fieldErrors).length > 0) code = 'Validation';
    else code = problem?.title ?? `Http${response.status}`;

    return new ApiError({
      status: response.status,
      code,
      requestId: response.headers.get('X-Request-Id') ?? problem?.requestId ?? null,
      fieldErrors,
      detail: problem?.detail,
    });
  }
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const text = await response.text();
    if (!text) return null;
    const data: unknown = JSON.parse(text);
    return typeof data === 'object' && data !== null ? data : null;
  } catch {
    return null;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
