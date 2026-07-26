'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Calendar, MapPin, Ticket, ShieldCheck, ChevronLeft, Plus, Minus, Tag } from 'lucide-react';

import { eventService, ticketService, paymentService } from '@/services';
import type { Event } from '@/types/api.types';
import type { TicketType } from '@/services/TicketService';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const [eventResult, ticketsResult] = await Promise.all([
        eventService.getEventById(eventId),
        ticketService.getEventTickets(eventId),
      ]);

      setEvent(eventResult);
      setTicketTypes(ticketsResult);

      if (ticketsResult.length > 0) {
        setSelectedTicketType(ticketsResult[0]);
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      toast.error('No se pudo cargar la información del evento');
      router.push('/events');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    if (!selectedTicketType) return 0;
    return selectedTicketType.price * quantity;
  };

  const calculateServiceFee = () => {
    return calculateSubtotal() * 0.1; // 10% de tarifa de servicio
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateServiceFee();
  };

  const validateForm = () => {
    if (!selectedTicketType) {
      toast.error('Por favor, selecciona un tipo de ticket');
      return false;
    }

    if (quantity < 1) {
      toast.error('Selecciona al menos un ticket');
      return false;
    }

    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Por favor, ingresa un número de tarjeta válido');
      return false;
    }

    if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      toast.error('Ingresa una fecha de expiración válida (MM/YY)');
      return false;
    }

    if (!cardCvc || cardCvc.length !== 3) {
      toast.error('Ingresa un CVC válido');
      return false;
    }

    if (!cardName) {
      toast.error('Ingresa el nombre del titular');
      return false;
    }

    return true;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      // Create payment intent
      const paymentResult = await paymentService.createPaymentIntent({
        amount: Math.round(calculateTotal() * 100), // Convertir a centavos
        currency: selectedTicketType!.currency || 'USD',
        metadata: {
          eventId,
          ticketTypeId: selectedTicketType!.id,
          quantity: quantity.toString(),
        },
      });

      // Purchase tickets
      await ticketService.purchaseTickets({
        eventId,
        tickets: [
          {
            ticketTypeId: selectedTicketType!.id,
            quantity,
          },
        ],
        paymentMethodId: paymentResult.clientSecret,
      });

      toast.success('¡Compra realizada con éxito!');
      router.push('/tickets');
    } catch (error: any) {
      console.error('Error al comprar tickets:', error);
      toast.error(error.message || 'Fallo al procesar la compra. Inténtalo de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    return parts.length ? parts.join(' ') : value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Preparando checkout...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="glass bg-white/60 dark:bg-gray-900/60 p-8 rounded-2xl border border-white/20 dark:border-white/10 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Evento no encontrado</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">El evento que buscas no existe o ha sido eliminado.</p>
          <button
            onClick={() => router.push('/events')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Explorar Eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A] text-gray-900 dark:text-white pb-24 pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.back()} 
            className="p-2 mr-4 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-full backdrop-blur-sm border border-gray-200 dark:border-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Checkout Seguro</h1>
            <p className="text-gray-500 dark:text-gray-400">Completa tu compra para asegurar tu lugar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left Column) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Event Info Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Ticket className="w-5 h-5 mr-3 text-blue-500" />
                Resumen del Evento
              </h2>
              <div className="flex flex-col md:flex-row gap-6">
                {event.imageUrl && (
                  <img 
                    src={event.imageUrl} 
                    alt={event.title} 
                    className="w-full md:w-48 h-32 object-cover rounded-2xl shadow-md"
                  />
                )}
                <div className="space-y-4 flex-1">
                  <h3 className="text-2xl font-bold">{event.title}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4 mr-3 text-blue-500" />
                      {new Date(event.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4 mr-3 text-red-500" />
                      {event.location?.address || 'Ubicación por confirmar'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Ticket Selection */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Tag className="w-5 h-5 mr-3 text-emerald-500" />
                Selecciona tu Ticket
              </h2>
              
              <div className="space-y-4">
                {ticketTypes.map((ticketType) => {
                  const isSelected = selectedTicketType?.id === ticketType.id;
                  const isSoldOut = ticketType.available <= 0;

                  return (
                    <button
                      key={ticketType.id}
                      disabled={isSoldOut}
                      onClick={() => setSelectedTicketType(ticketType)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                          : isSoldOut 
                            ? 'border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                            : 'border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-white/50 dark:hover:bg-white/5'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-lg mb-1">{ticketType.name}</div>
                          <div className={`text-sm ${isSoldOut ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            {isSoldOut ? 'Agotado' : `Quedan ${ticketType.available} disponibles`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {ticketType.currency === 'USD' ? '$' : '€'}{ticketType.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                
                {ticketTypes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay tickets disponibles para este evento en este momento.
                  </div>
                )}
              </div>

              {/* Quantity Selector (Shows only if a ticket is selected) */}
              <AnimatePresence>
                {selectedTicketType && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between"
                  >
                    <span className="font-medium text-lg">Cantidad</span>
                    <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Minus className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                      </button>
                      <span className="text-xl font-bold w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Payment Details */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 text-gray-100 dark:text-gray-800/30 transform translate-x-4 -translate-y-4">
                <CreditCard className="w-48 h-48" />
              </div>
              
              <h2 className="text-xl font-bold mb-6 flex items-center relative z-10">
                <ShieldCheck className="w-5 h-5 mr-3 text-purple-500" />
                Pago Seguro
              </h2>
              
              <div className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Número de Tarjeta
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full pl-12 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Expiración
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => {
                        let text = e.target.value.replace(/[^0-9]/g, '');
                        if (text.length > 2) text = text.substring(0,2) + '/' + text.substring(2,4);
                        setCardExpiry(text);
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-600 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      CVC / CVV
                    </label>
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white font-mono placeholder-gray-400 dark:placeholder-gray-600 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    placeholder="JOHN DOE"
                    className="w-full px-4 py-3 bg-white/50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 uppercase"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column (Order Summary - Sticky) */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="glass bg-blue-600/5 dark:bg-blue-900/10 backdrop-blur-xl border border-blue-500/20 dark:border-blue-500/10 rounded-3xl p-6 md:p-8 lg:sticky lg:top-8"
            >
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Tu Pedido</h2>

              {selectedTicketType ? (
                <div className="space-y-6">
                  {/* Item List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedTicketType.name}</p>
                        <p className="text-sm">{quantity}x Ticket{quantity > 1 && 's'}</p>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedTicketType.currency === 'USD' ? '$' : '€'}{calculateSubtotal().toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span>Tarifas de Servicio (10%)</span>
                      <span>
                        {selectedTicketType.currency === 'USD' ? '$' : '€'}{calculateServiceFee().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-blue-500/20 dark:border-blue-500/10 pt-6 mt-6">
                    <div className="flex justify-between items-end mb-8">
                      <span className="text-lg font-medium text-gray-900 dark:text-gray-100">Total a Pagar</span>
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                        {selectedTicketType.currency === 'USD' ? '$' : '€'}{calculateTotal().toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={handlePurchase}
                      disabled={processing || !selectedTicketType}
                      className="w-full relative group overflow-hidden rounded-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all duration-300" />
                      <div className="relative px-8 py-4 flex items-center justify-center text-white font-bold text-lg">
                        {processing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-3" />
                            Procesando Pago...
                          </>
                        ) : (
                          'Comprar Ahora'
                        )}
                      </div>
                    </button>

                    <div className="mt-6 flex flex-col items-center gap-2 opacity-60">
                      <ShieldCheck className="w-5 h-5" />
                      <p className="text-xs text-center">
                        Tus pagos están seguros y encriptados. <br/>
                        Al continuar aceptas nuestros Términos de Servicio.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 opacity-50 flex flex-col items-center">
                  <Ticket className="w-12 h-12 mb-4" />
                  <p>Selecciona un ticket para ver el resumen de tu pedido.</p>
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}