import { db } from '@/lib/db'
import { collabDeals, escrows } from '@/lib/db/schema'

type CreateDealInput = {
  campaignId: string
  creatorId: string
  msmeId: string
  agreedAmount: string | number
}

export async function createDeal({ campaignId, creatorId, msmeId, agreedAmount }: CreateDealInput) {
  return db.transaction(async (transaction) => {
    const amount = String(agreedAmount)
    const [deal] = await transaction
      .insert(collabDeals)
      .values({
        campaignId,
        creatorId,
        msmeId,
        agreedAmount: amount,
      })
      .returning()

    await transaction.insert(escrows).values({
      dealId: deal.id,
      totalAmount: amount,
      status: 'unfunded',
    })

    return deal
  })
}
