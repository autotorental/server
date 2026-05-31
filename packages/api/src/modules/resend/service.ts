import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { Logger, NotificationTypes } from "@medusajs/framework/types"
import { sendEmail } from "../../lib/email"

type InjectedDependencies = { logger: Logger }
type Options = { from?: string }

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected logger_: Logger
  protected from_: string

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.from_ = options.from || process.env.ZOHO_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <no-reply@autotorental.com>"
  }

  async send(notification: NotificationTypes.ProviderSendNotificationDTO): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No notification information provided")
    }
    if (notification.channel === "sms") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "SMS not supported by SMTP email provider")
    }

    const subject = (notification.data?.subject as string) || (notification.content as any)?.subject || "Notification"
    const html = (notification.data?.html as string) || (notification.content as any)?.html || (notification.template ? `<p>${notification.template}</p>` : undefined)
    const text = (notification.data?.text as string) || (notification.content as any)?.text || notification.content?.toString?.()

    try {
      const result = await sendEmail({
        from: this.from_,
        to: notification.to,
        subject,
        html: html || `<p>${text || ""}</p>`,
        text,
      })
      this.logger_.info(`SMTP email sent → ${notification.to} (id=${result.id})`)
      return { id: result.id }
    } catch (e: any) {
      this.logger_.error("SMTP send failed: " + e.message)
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, e.message)
    }
  }
}

export default ResendNotificationProviderService
