export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string | undefined;
  errors?: { [key: string]: string[] } | undefined;
  data?: T;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

/**
 * Lay payload an toan tu response envelope va chu dong nem loi nghiep vu de UI xu ly tap trung.
 */
export function unwrapData<T>(response: ApiEnvelope<T>, fallbackValue: T): T {
  if (response.success === false) {
    throw new Error(response.message ?? 'Yeu cau that bai tu he thong API.');
  }

  return response.data ?? fallbackValue;
}

/**
 * Chuan hoa response co phan trang ve 1 kieu du lieu duy nhat de table/paginator tai su dung.
 */
export function unwrapPaged<T>(response: {
  success?: boolean;
  message?: string | undefined;
  data?: T[] | undefined;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
  totalRecords?: number;
}): PagedResult<T> {
  if (response.success === false) {
    throw new Error(
      response.message ?? 'Yeu cau phan trang that bai tu he thong API.',
    );
  }

  return {
    items: response.data ?? [],
    pageNumber: response.pageNumber ?? 1,
    pageSize: response.pageSize ?? 10,
    totalPages: response.totalPages ?? 0,
    totalRecords: response.totalRecords ?? 0,
  };
}
