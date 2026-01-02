-- Create audit log table for segment changes
CREATE TABLE public.segment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    project_id TEXT,
    matricula TEXT,
    owner_name TEXT,
    city TEXT,
    state TEXT,
    action_type TEXT NOT NULL, -- 'correction', 'manual_override', 'ai_suggestion'
    risk_acknowledged BOOLEAN DEFAULT false,
    warning_message TEXT,
    segments_before JSONB NOT NULL,
    segments_after JSONB NOT NULL,
    change_description TEXT NOT NULL,
    user_message TEXT,
    ai_response TEXT,
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.segment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view their own audit logs"
ON public.segment_audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own logs
CREATE POLICY "Users can insert their own audit logs"
ON public.segment_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_user_id ON public.segment_audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.segment_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_matricula ON public.segment_audit_logs(matricula);