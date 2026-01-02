import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Send, X, Loader2, Bot, User, Paperclip, FileText, Image as ImageIcon, AlertTriangle, Check, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Segment } from '@/types';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachment?: {
    name: string;
    type: string;
    url?: string;
  };
  requiresConfirmation?: boolean;
  pendingChange?: {
    segments: Segment[];
    warning: string;
    changeDescription: string;
  };
  confirmed?: boolean;
}

interface AIAssistantChatProps {
  segments: Segment[];
  propertyData: {
    matricula?: string;
    owner?: string;
    city?: string;
    state?: string;
    area?: number;
    closureError?: number;
  };
  projectId?: string;
  onSegmentsUpdate: (segments: Segment[]) => void;
  onPropertyUpdate?: (data: any) => void;
}

export function AIAssistantChat({ 
  segments, 
  propertyData, 
  projectId,
  onSegmentsUpdate,
  onPropertyUpdate 
}: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Olá! Sou seu assistente de georreferenciamento. Vi que há um erro de fechamento de ${propertyData.closureError?.toFixed(2) || 'N/A'}m no polígono. 

Você pode:
• Enviar fotos/PDFs de matrículas para eu analisar
• Pedir correções de rumos ou distâncias
• Solicitar que eu recalcule o polígono

⚠️ Todas as alterações são registradas com data/hora para sua segurança.

Como posso ajudar?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const logAuditEvent = async (
    actionType: string,
    segmentsBefore: Segment[],
    segmentsAfter: Segment[],
    changeDescription: string,
    userMessage: string,
    aiResponse: string,
    riskAcknowledged: boolean = false,
    warningMessage?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use type assertion since the table was just created and types aren't regenerated yet
      await (supabase.from('segment_audit_logs') as any).insert({
        user_id: user.id,
        project_id: projectId,
        matricula: propertyData.matricula,
        owner_name: propertyData.owner,
        city: propertyData.city,
        state: propertyData.state,
        action_type: actionType,
        risk_acknowledged: riskAcknowledged,
        warning_message: warningMessage,
        segments_before: segmentsBefore,
        segments_after: segmentsAfter,
        change_description: changeDescription,
        user_message: userMessage,
        ai_response: aiResponse,
        user_agent: navigator.userAgent
      });

      console.log('Audit log recorded:', actionType);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  };

  const handleConfirmChange = async (messageId: string, confirmed: boolean) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.pendingChange) {
        if (confirmed) {
          // Apply the change
          onSegmentsUpdate(msg.pendingChange.segments);
          
          // Log with risk acknowledged
          logAuditEvent(
            'manual_override',
            segments,
            msg.pendingChange.segments,
            msg.pendingChange.changeDescription,
            'Usuário confirmou alteração de risco',
            msg.content,
            true,
            msg.pendingChange.warning
          );

          toast.success('Alteração aplicada e registrada no log de auditoria');
          
          return {
            ...msg,
            confirmed: true,
            requiresConfirmation: false,
            content: msg.content + '\n\n✅ Alteração aplicada por sua conta e risco. Log registrado.'
          };
        } else {
          toast.info('Alteração cancelada');
          return {
            ...msg,
            confirmed: false,
            requiresConfirmation: false,
            content: msg.content + '\n\n❌ Alteração cancelada pelo usuário.'
          };
        }
      }
      return msg;
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use imagens, PDF ou Word.');
      return;
    }

    setIsUploading(true);

    try {
      const base64 = await fileToBase64(file);
      
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Analise este arquivo: ${file.name}`,
        timestamp: new Date(),
        attachment: {
          name: file.name,
          type: file.type,
        }
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('ai-matricula-chat', {
        body: {
          message: `Analise este documento de matrícula que estou enviando. O arquivo se chama "${file.name}". Extraia os dados de rumos/distâncias e compare com os segmentos atuais. Se encontrar diferenças, corrija automaticamente.`,
          segments,
          propertyData,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          fileAttachment: {
            name: file.name,
            type: file.type,
            base64: base64
          }
        }
      });

      if (error) throw error;

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      // Check if this is a risky change that needs confirmation
      if (data.requiresConfirmation && data.updatedSegments) {
        assistantMessage.requiresConfirmation = true;
        assistantMessage.pendingChange = {
          segments: data.updatedSegments,
          warning: data.warningMessage || 'Esta alteração pode não estar de acordo com a matrícula original.',
          changeDescription: data.changeDescription || 'Alteração solicitada pelo usuário'
        };
      } else if (data.updatedSegments) {
        // Safe change - apply and log
        onSegmentsUpdate(data.updatedSegments);
        await logAuditEvent(
          'ai_suggestion',
          segments,
          data.updatedSegments,
          data.changeDescription || 'Correção automática da IA',
          userMessage.content,
          data.response,
          false
        );
        toast.success('Segmentos atualizados com base na análise');
      }

      setMessages(prev => [...prev, assistantMessage]);

      if (data.updatedPropertyData && onPropertyUpdate) {
        onPropertyUpdate(data.updatedPropertyData);
      }

    } catch (error) {
      console.error('Error processing file:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, não consegui processar o arquivo. Tente enviar uma imagem mais clara ou descreva o conteúdo manualmente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-matricula-chat', {
        body: {
          message: currentInput,
          segments,
          propertyData,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (error) throw error;

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      // Check if this is a risky change that needs confirmation
      if (data.requiresConfirmation && data.updatedSegments) {
        assistantMessage.requiresConfirmation = true;
        assistantMessage.pendingChange = {
          segments: data.updatedSegments,
          warning: data.warningMessage || 'Esta alteração pode não estar de acordo com a matrícula original.',
          changeDescription: data.changeDescription || 'Alteração solicitada pelo usuário'
        };
      } else if (data.updatedSegments) {
        // Safe change - apply and log
        onSegmentsUpdate(data.updatedSegments);
        await logAuditEvent(
          'correction',
          segments,
          data.updatedSegments,
          data.changeDescription || 'Correção via chat',
          currentInput,
          data.response,
          false
        );
      }

      setMessages(prev => [...prev, assistantMessage]);

      if (data.updatedPropertyData && onPropertyUpdate) {
        onPropertyUpdate(data.updatedPropertyData);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-h-[650px]"
          >
            <Card className="shadow-2xl border-2">
              <CardHeader className="pb-3 bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-lg">Assistente IA</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <ScrollArea className="h-[450px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="max-w-[300px] space-y-2">
                          <div
                            className={`rounded-lg px-3 py-2 text-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.attachment && (
                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-current/20">
                                {getFileIcon(message.attachment.type)}
                                <span className="text-xs truncate max-w-[200px]">
                                  {message.attachment.name}
                                </span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>

                          {/* Confirmation UI for risky changes */}
                          {message.requiresConfirmation && message.pendingChange && (
                            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-xs">
                                <p className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                  ⚠️ {message.pendingChange.warning}
                                </p>
                                <p className="text-amber-700 dark:text-amber-300 mb-3">
                                  Deseja prosseguir por sua conta e risco?
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleConfirmChange(message.id, true)}
                                    className="h-7 text-xs"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Aceito o risco
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleConfirmChange(message.id, false)}
                                    className="h-7 text-xs"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Cancelar
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        {message.role === 'user' && (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                    
                    {(isLoading || isUploading) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            {isUploading ? 'Analisando arquivo...' : 'Pensando...'}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || isUploading}
                      title="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Digite ou anexe arquivo..."
                      disabled={isLoading || isUploading}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isLoading || isUploading || !input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
