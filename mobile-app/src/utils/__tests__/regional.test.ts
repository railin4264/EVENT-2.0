import { regionalFor, formatMoney } from '../regional';

describe('regionalFor', () => {
  it('uses the country where the event happens before the person country', () => {
    expect(regionalFor({ location: { countryCode: 'ES' } }, { countryCode: 'DO' })).toMatchObject({ currency: 'EUR', splitBill: 'Bote' });
    expect(regionalFor({ location: { countryCode: 'DO' } }, null)).toMatchObject({ currency: 'DOP', currencySymbol: 'RD$', splitBill: 'Serrucho' });
    expect(regionalFor({ location: {} }, { countryCode: 'co' })).toMatchObject({ currency: 'COP', splitBill: 'Vaca' });
  });

  it('gives other countries their real currency and neutral wording, never Dominican banks', () => {
    const peru = regionalFor({ location: { countryCode: 'PE' } }, null);
    expect(peru).toMatchObject({ currency: 'PEN', splitBill: 'Dividir la cuenta', banks: ['Transferencia bancaria', 'Efectivo'] });
    expect(JSON.stringify(peru)).not.toMatch(/RD\$|Serrucho|Banco Popular|panas/);
  });

  it('falls back to the event price currency when the country is unknown', () => {
    expect(regionalFor({ location: {}, price: { amount: 10, currency: 'GBP' } }, null).currency).toBe('GBP');
  });

  it('formats money with the regional symbol', () => {
    expect(formatMoney(1500, regionalFor({ location: { countryCode: 'DO' } }))).toMatch(/^RD\$ 1[.,]?500$/);
  });
});
