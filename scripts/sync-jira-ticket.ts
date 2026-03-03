import { v7 as uuidv7 } from 'uuid';
import { JiraClient } from '@/lib/api/jira';
import { TicketStorage } from '@/lib/storage/ticket-storage';
import { logger } from '@/lib/logger/winston';

async function syncTicket(jiraKey: string) {
  if (!jiraKey) {
    console.error('Usage: yarn sync-jira <JIRA_KEY> (e.g. ABC-1666)');
    process.exit(1);
  }

  logger.info(`Starting CLI sync for ticket: ${jiraKey}`);
  
  const baseURL = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseURL || !email || !apiToken) {
    logger.error('Missing Jira credentials in .env.local');
    process.exit(1);
  }

  try {
    const client = new JiraClient(baseURL, email, apiToken);
    const ticketStorage = new TicketStorage();

    // Fetch from Jira
    logger.info(`Fetching data from Jira...`);
    const issueData = await client.fetchFullIssue(jiraKey);

    // Check if it already exists locally to keep localId
    const existingIndex = await ticketStorage.getAll();
    const existingEntry = existingIndex.find(t => t.jiraKey === jiraKey);
    
    let localId = existingEntry?.localId;
    
    if (localId) {
      logger.info(`Ticket found locally with ID: ${localId}. Updating...`);
    } else {
      logger.info(`Ticket not found locally. Creating new entry...`);
    }

    const ticketToSave: any = {
      ...issueData,
      localId: localId || uuidv7(),
      jiraKey: jiraKey, // Ensure the key is present
    };

    await ticketStorage.save(ticketToSave);
    const newTicket = ticketToSave;

    if (!newTicket.localId) {
      throw new Error("Failed to generate local ID for ticket");
    }

    logger.info(`Saved ticket data to local storage.`);

    // Download attachments
    if (issueData.attachments && issueData.attachments.length > 0) {
      logger.info(`Found ${issueData.attachments.length} attachments. Synchronizing...`);
      const attachmentsDir = await ticketStorage.getAttachmentsDir(newTicket.localId);
      await client.syncTicketAttachments(newTicket, attachmentsDir);
    } else {
      logger.info(`No attachments found for this ticket.`);
    }

    logger.info(`✅ Successfully synced ${jiraKey} to local ID: ${newTicket.localId}`);
    
  } catch (error: any) {
    logger.error(`Failed to sync ticket ${jiraKey}`, { error: error.message });
    process.exit(1);
  }
}

const args = process.argv.slice(2);
syncTicket(args[0]);
