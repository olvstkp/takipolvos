import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Customer, Product, Proforma, ProductType } from '../types/proforma';

// Customers Hook
export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error) throw error;

            const formattedCustomers: Customer[] = data.map((item: any) => ({
                id: item.id,
                name: item.name,
                address: item.address,
                taxId: item.tax_id,
                contactPerson: item.contact_person,
                phone: item.phone,
                phone2: item.phone2,
                email: item.email,
                delivery: item.delivery
            }));

            setCustomers(formattedCustomers);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert({
                    name: customerData.name,
                    address: customerData.address,
                    tax_id: customerData.taxId,
                    contact_person: customerData.contactPerson,
                    phone: customerData.phone,
                    phone2: customerData.phone2,
                    email: customerData.email,
                    delivery: customerData.delivery
                })
                .select()
                .single();

            if (error) throw error;
            await fetchCustomers(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error adding customer:', error);
            throw error;
        }
    };

    const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
        try {
            const { data, error } = await supabase
                .from('customers')
                .update({
                    name: customerData.name,
                    address: customerData.address,
                    tax_id: customerData.taxId,
                    contact_person: customerData.contactPerson,
                    phone: customerData.phone,
                    phone2: customerData.phone2,
                    email: customerData.email,
                    delivery: customerData.delivery
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            await fetchCustomers(); // Refresh list
            return data;
        } catch (error) {
            console.error('Error updating customer:', error);
            throw error;
        }
    };

    const deleteCustomer = async (id: string) => {
        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchCustomers(); // Refresh list
        } catch (error) {
            console.error('Error deleting customer:', error);
            throw error;
        }
    };

    return { 
        customers, 
        loading, 
        error, 
        refetch: fetchCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer
    };
};

// Products Hook
export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select(`
                    *,
                    series (
                        name,
                        pieces_per_case,
                        net_weight_kg_per_piece,
                        packaging_weight_kg_per_case
                    )
                `)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            // Mock product type assignments (gerçek veritabanında bu bilgiler olacak)
            const getProductTypeAndSize = (productName: string) => {
                const name = productName.toLowerCase();
                if (name.includes('shower gel')) {
                    return { product_type_id: '1', size_value: 750, size_unit: 'ML' };
                } else if (name.includes('liquid') && name.includes('soap')) {
                    return { product_type_id: '2', size_value: name.includes('500') ? 500 : 450, size_unit: 'ML' };
                } else if (name.includes('soap') && (name.includes('100g') || name.includes('125g'))) {
                    return { product_type_id: '3', size_value: name.includes('125') ? 125 : 100, size_unit: 'G' };
                } else if (name.includes('lotion')) {
                    return { product_type_id: '4', size_value: 250, size_unit: 'ML' };
                } else if (name.includes('shampoo')) {
                    return { product_type_id: '5', size_value: 350, size_unit: 'ML' };
                } else {
                    return { product_type_id: '3', size_value: 100, size_unit: 'G' }; // Default to soap
                }
            };

            const formattedProducts: Product[] = data.map((item: any) => {
                const typeAndSize = getProductTypeAndSize(item.name);
                return {
                    id: item.id,
                    name: item.name,
                    sku: item.id,
                    series: item.series?.name || 'Unknown',
                    pricePerCase: item.price_per_case,
                    pricePerPiece: item.price_per_piece,
                    // Simulate USD prices (1 EUR = 1.08 USD)
                    pricePerCaseUsd: item.price_per_case * 1.08,
                    pricePerPieceUsd: item.price_per_piece * 1.08,
                    net_weight_kg_per_piece: item.series?.net_weight_kg_per_piece || 0,
                    piecesPerCase: item.series?.pieces_per_case || 1,
                    packaging_weight_kg_per_case: item.series?.packaging_weight_kg_per_case || 0,
                    width_cm: 0,
                    height_cm: 0,
                    depth_cm: 0,
                    // Mock size and product type data
                    product_type_id: typeAndSize.product_type_id,
                    size_value: typeAndSize.size_value,
                    size_unit: typeAndSize.size_unit,
                    // Add proforma_group_id from Supabase
                    proforma_group_id: item.proforma_group_id
                };
            });

            setProducts(formattedProducts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { products, loading, error, refetch: fetchProducts };
};

// Proforma Operations Hook
export const useProformaOperations = () => {
    const [saving, setSaving] = useState(false);

    const saveProforma = async (proformaData: Proforma) => {
        try {
            setSaving(true);

            // Calculate validity_date if not provided
            let validityDate = proformaData.validityDate;
            if (!validityDate) {
                const issueDate = new Date(proformaData.issueDate);
                issueDate.setDate(issueDate.getDate() + 30);
                validityDate = issueDate.toISOString().split('T')[0];
            }

            // Insert proforma
            const { data: proformaResult, error: proformaError } = await supabase
                .from('proformas')
                .insert({
                    customer_id: proformaData.customerId,
                    issue_date: proformaData.issueDate,
                    validity_date: validityDate,
                    payment_method: proformaData.paymentMethod,
                    bank_name: proformaData.bankInfo.bankName,
                    bank_branch: proformaData.bankInfo.branch,
                    swift_code: proformaData.bankInfo.swiftCode,
                    account_number: proformaData.bankInfo.accountNumber,
                    notes: proformaData.notes,
                    departure: proformaData.departure,
                    delivery: proformaData.delivery,
                    brand: proformaData.brand,
                    weight_per_pallet_kg: proformaData.shipment.weight_per_pallet_kg
                })
                .select()
                .single();

            if (proformaError) throw proformaError;

            const proformaId = proformaResult.id;

            // Insert proforma items
            if (proformaData.items.length > 0) {
                const itemsToInsert = proformaData.items.map(item => ({
                    proforma_id: proformaId,
                    product_id: item.productId,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unit_price: item.unitPrice,
                    total: item.total
                }));

                const { error: itemsError } = await supabase
                    .from('proforma_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }

            // Insert pallets
            if (proformaData.shipment.pallets.length > 0) {
                const palletsToInsert = proformaData.shipment.pallets.map(pallet => ({
                    proforma_id: proformaId,
                    pallet_number: pallet.pallet_number,
                    width_cm: pallet.width_cm,
                    length_cm: pallet.length_cm,
                    height_cm: pallet.height_cm
                }));

                const { error: palletsError } = await supabase
                    .from('pallets')
                    .insert(palletsToInsert);

                if (palletsError) throw palletsError;
            }

            return proformaResult;
        } catch (error) {
            console.error('Error saving proforma:', error);
            throw error;
        } finally {
            setSaving(false);
        }
    };

    return { saveProforma, saving };
};

// Product Types Hook
export const useProductTypes = () => {
    const [productTypes, setProductTypes] = useState<ProductType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProductTypes();
    }, []);

    const fetchProductTypes = async () => {
        try {
            setLoading(true);
            
            // Mock data (Supabase read-only olduğu için)
            const mockProductTypes: ProductType[] = [
                { id: '1', name: 'Shower Gel', packing_list_name: 'SHOWER GEL', is_liquid: true },
                { id: '2', name: 'Liquid Soap', packing_list_name: 'LIQUID SOAP', is_liquid: true },
                { id: '3', name: 'Bar Soap', packing_list_name: 'SOAP', is_liquid: false },
                { id: '4', name: 'Body Lotion', packing_list_name: 'BODY LOTION', is_liquid: true },
                { id: '5', name: 'Hair Shampoo', packing_list_name: 'SHAMPOO', is_liquid: true },
                { id: '6', name: 'Hair Conditioner', packing_list_name: 'CONDITIONER', is_liquid: true }
            ];

            setProductTypes(mockProductTypes);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { productTypes, loading, error };
}; 

// Proforma Groups Hook
export const useProformaGroups = () => {
    const [proformaGroups, setProformaGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProformaGroups();
    }, []);

    const fetchProformaGroups = async () => {
        try {
            setLoading(true);
            
            // Supabase'den gerçek veriyi çek
            const { data, error: supabaseError } = await supabase
                .from('proforma_groups')
                .select('*')
                .eq('is_active', true)
                .order('id', { ascending: true });

            if (supabaseError) {
                console.error('Supabase error:', supabaseError);
                setError(supabaseError.message);
                setProformaGroups([]);
            } else {
                console.log('✅ Supabase proforma groups loaded:', data);
                setProformaGroups(data || []);
            }
        } catch (err: any) {
            console.error('Error fetching proforma groups:', err);
            setError(err.message);
            setProformaGroups([]);
        } finally {
            setLoading(false);
        }
    };

    const addProformaGroup = async (groupData: any) => {
        try {
            // Generate next ID
            const { data: existingGroups } = await supabase
                .from('proforma_groups')
                .select('id')
                .order('id');

            let nextId = 'pg_1';
            if (existingGroups && existingGroups.length > 0) {
                const maxNum = Math.max(...existingGroups
                    .map(g => parseInt(g.id.replace('pg_', '')))
                    .filter(num => !isNaN(num))
                );
                nextId = `pg_${maxNum + 1}`;
            }

            // Supabase'e ekle
            const { data, error } = await supabase
                .from('proforma_groups')
                .insert({
                    id: nextId,
                    name: groupData.name,
                    is_active: true
                })
                .select()
                .single();

            if (error) {
                console.error('Supabase error adding group:', error);
                throw error;
            }

            // Refresh list
            await fetchProformaGroups();
            return data;
        } catch (error) {
            console.error('Error adding proforma group:', error);
            throw error;
        }
    };

    const setProductGroupAssignment = (productId: string, groupId: string) => {
        try {
            const assignments = JSON.parse(localStorage.getItem('productGroupAssignments') || '{}');
            assignments[productId] = groupId;
            localStorage.setItem('productGroupAssignments', JSON.stringify(assignments));
            
            // Dispatch custom event to notify other components
            window.dispatchEvent(new CustomEvent('productGroupAssignmentChanged', {
                detail: { productId, groupId }
            }));
        } catch (error) {
            console.error('Error setting product group assignment:', error);
        }
    };

    const getProductGroupAssignments = () => {
        try {
            return JSON.parse(localStorage.getItem('productGroupAssignments') || '{}');
        } catch (error) {
            console.error('Error getting product group assignments:', error);
            return {};
        }
    };

        return {
        proformaGroups,
        setProformaGroups,
        loading,
        error,
        addProformaGroup,
        setProductGroupAssignment,
        getProductGroupAssignments
    };
}; 