export type SupplierCategory = 'flowers' | 'decor' | 'catering' | 'music' | 'photo' | 'video' | 'venue' | 'cake' | 'transport' | 'others';
export type SupplierFileCategory = 'contract' | 'price_list' | 'portfolio' | 'other';
export type EventSupplierStatus = 'researched' | 'quote_requested' | 'quote_received' | 'shortlisted' | 'selected' | 'rejected';
export interface Supplier {
    id: string;
    planner_id: string;
    name: string;
    category: SupplierCategory;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    location: string | null;
    notes: string | null;
    rating_internal: number | null;
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
    linked_events_count?: number;
}
export interface SupplierFile {
    id: string;
    supplier_id: string;
    file_name: string;
    file_url: string;
    category: SupplierFileCategory;
    uploaded_at: string;
}
export interface EventSupplier {
    id: string;
    event_id: string;
    supplier_id: string;
    category: string;
    status: EventSupplierStatus;
    quoted_price: string | null;
    currency: string;
    notes: string | null;
    created_at: string;
    supplier?: Supplier;
}
export interface EventSupplierQuote {
    id: string;
    event_supplier_id: string;
    version_label: string;
    amount: string;
    currency: string;
    valid_until: string | null;
    notes: string | null;
    created_at: string;
}
export type Result<T> = {
    data: T | null;
    error: string | null;
};
export interface ListSuppliersFilters {
    search?: string;
    category?: SupplierCategory | 'all';
    favoritesOnly?: boolean;
}
export declare function listSuppliers(filters?: ListSuppliersFilters): Promise<Result<Supplier[]>>;
export interface CreateSupplierInput {
    name: string;
    category: SupplierCategory;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    location?: string | null;
    notes?: string | null;
}
export declare function createSupplier(input: CreateSupplierInput): Promise<Result<Supplier>>;
export type UpdateSupplierInput = Partial<Pick<Supplier, 'name' | 'category' | 'company_name' | 'email' | 'phone' | 'website' | 'location' | 'notes' | 'rating_internal' | 'is_favorite'>>;
export declare function updateSupplier(id: string, patch: UpdateSupplierInput): Promise<Result<Supplier>>;
export declare function deleteSupplier(id: string): Promise<Result<null>>;
export declare function listEventSuppliers(eventId: string): Promise<Result<EventSupplier[]>>;
export interface AddEventSupplierInput {
    supplier_id: string;
    category: string;
    status?: EventSupplierStatus;
    quoted_price?: string | null;
    currency?: string;
    notes?: string | null;
}
export declare function addEventSupplier(eventId: string, input: AddEventSupplierInput): Promise<Result<EventSupplier>>;
export type UpdateEventSupplierInput = Partial<Pick<EventSupplier, 'status' | 'quoted_price' | 'currency' | 'notes'>>;
export declare function updateEventSupplier(id: string, patch: UpdateEventSupplierInput): Promise<Result<EventSupplier>>;
//# sourceMappingURL=suppliersApi.d.ts.map