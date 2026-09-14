import { waitForBrowserMock } from './mocks/ready'

// Begin registration before hydration; request entry points await the same promise.
void waitForBrowserMock()
