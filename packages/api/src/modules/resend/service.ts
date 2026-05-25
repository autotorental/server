import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { Logger, NotificationTypes } from "@medusajs/framework/types"
import { Resend } from "resend"

type InjectedDependencies = { logger: Logger }
type Options = { api_key: string; from: string }

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected logger_: Logger
  protected resend_: Resend
  protected from_: string

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.from_ = options.from
    if (!options.api_key) throw new Error("Missing Resend api_key")
    this.resend_ = new Resend(options.api_key)
  }

  async send(notification: NotificationTypes.ProviderSendNotificationDTO): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No notification information provided")
    }
    if (notification.channel === "sms") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "SMS not supported by Resend")
    }

    const subject = (notification.data?.subject as string) || (notification.content as any)?.subject || "Notification"
    const html = (notification.data?.html as string) || (notification.content as any)?.html || (notification.template ? `<p>${notification.template}</p>` : undefined)
    const text = (notification.data?.text as string) || (notification.content as any)?.text || notification.content?.toString?.()

    try {
      const result = await this.resend_.emails.send({
        from: this.from_,
        to: [notification.to],
        subject,
        html: html || `<p>${text || ""}</p>`,
        text,
      })
      this.logger_.info(`Resend email sent → ${notification.to} (id=${result.data?.id})`)
      return { id: result.data?.id }
    } catch (e: any) {
      this.logger_.error("Resend send failed: " + e.message)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, e.message)
    }
  }
}

export default ResendNotificationProviderService
