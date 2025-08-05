// Error handling utilities

export const handleSupabaseError = (error: any, defaultMessage: string = 'Beklenmeyen bir hata oluştu') => {
    console.error('Supabase Error:', error);
    
    // Network/Connection errors
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.message?.includes('fetch')) {
        return 'İnternet bağlantısı problemi. Lütfen tekrar deneyin.';
    }
    
    // Auth errors
    if (error.message?.includes('JWT') || 
        error.message?.includes('token') ||
        error.code === 'PGRST301') {
        return 'Oturum süreniz dolmuş. Lütfen sayfayı yenileyin.';
    }
    
    // Permission/RLS errors
    if (error.message?.includes('permission') || 
        error.message?.includes('policy') ||
        error.code === 'PGRST116') {
        return 'Yetki hatası. Lütfen yöneticinizle iletişime geçin.';
    }
    
    // Database specific errors
    if (error.code === '23505') {
        return 'Bu kayıt zaten mevcut!';
    }
    
    if (error.code === '23503') {
        return 'İlişkili veri bulunamadı!';
    }
    
    if (error.code === '42P01') {
        return 'Veritabanı tablosu bulunamadı!';
    }
    
    // Storage errors
    if (error.message?.includes('storage') || error.message?.includes('bucket')) {
        return 'Dosya yükleme hatası. Lütfen tekrar deneyin.';
    }
    
    // Return specific error message if available, otherwise default
    return error.message || defaultMessage;
};

export const createErrorBoundaryHandler = (componentName: string) => {
    return (error: Error, errorInfo: React.ErrorInfo) => {
        console.error(`Error in ${componentName}:`, error, errorInfo);
        
        // Log to external service if needed
        // Example: Sentry.captureException(error, { extra: errorInfo });
        
        return {
            message: `${componentName} bileşeninde hata oluştu`,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    };
};

export const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    errorMessage?: string
): Promise<{ data: T | null; error: string | null }> => {
    try {
        const data = await operation();
        return { data, error: null };
    } catch (error: any) {
        const message = handleSupabaseError(error, errorMessage);
        return { data: null, error: message };
    }
};