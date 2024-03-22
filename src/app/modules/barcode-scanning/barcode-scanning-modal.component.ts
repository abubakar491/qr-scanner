import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DialogService } from '@app/core';
import {
  Barcode,
  BarcodeFormat,
  BarcodeScanner,
  LensFacing,
  StartScanOptions,
} from '@capacitor-mlkit/barcode-scanning';
import { InputCustomEvent, ToastController } from '@ionic/angular';

interface OrderList {
  [key: string]: {
    expectedQuantity: number;
    scannedQuantity: number;
  };
}

@Component({
  selector: 'app-barcode-scanning',
  templateUrl: `./barcode-scanning-modal.component.html`,
  styleUrls: ['./barcode-scanning-modal.component.scss'],
})
export class BarcodeScanningModalComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() formats: BarcodeFormat[] = [];
  @Input() lensFacing: LensFacing = LensFacing.Back;
  @ViewChild('square') squareElement!: ElementRef<HTMLDivElement>;

  public isTorchAvailable = false;
  public minZoomRatio: number | undefined;
  public maxZoomRatio: number | undefined;
  private scannerListener: any;
  public barcodeArr: any[] = [];
  showNotification = false;
  notificationMessage = '';

  private currentOrderList: OrderList = {
    item1: { expectedQuantity: 5, scannedQuantity: 0 },
    item2: { expectedQuantity: 5, scannedQuantity: 0 },
    item3: { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item4': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item5': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item6': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item7': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item8': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item9': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item10': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item11': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item12': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item13': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item14': { expectedQuantity: 5, scannedQuantity: 0 },
    // 'item15': { expectedQuantity: 5, scannedQuantity: 0 }
  };

  constructor(
    private readonly dialogService: DialogService,
    private readonly ngZone: NgZone,
    private toastController: ToastController,
  ) {}

  ngOnInit(): void {
    this.barcodeArr = [];
    BarcodeScanner.isTorchAvailable().then((result) => {
      this.isTorchAvailable = result.available;
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.startScan();
    }, 500);
  }

  ngOnDestroy(): void {
    this.stopScan();
    if (this.scannerListener) {
      this.scannerListener.remove();
    }
  }

  private updateDisplayList(): void {
    console.log('idhr aya 5');
    this.barcodeArr = Object.keys(this.currentOrderList).map((key) => {
      return {
        name: key,
        ...this.currentOrderList[key],
        isComplete:
          this.currentOrderList[key].scannedQuantity >=
          this.currentOrderList[key].expectedQuantity,
      };
    });
  }

  getCompletedItemCount(): number {
    return this.barcodeArr.filter((item) => item.isComplete).length;
  }

  setZoomRatio(event: InputCustomEvent): void {
    if (!event.detail.value) {
      return;
    }
    BarcodeScanner.setZoomRatio({
      zoomRatio: parseInt(event.detail.value as any, 10),
    });
  }

  closeModal(barcode?: Barcode): void {
    this.dialogService.dismissModal({
      barcode: barcode,
    });
  }

  toggleTorch(): void {
    BarcodeScanner.toggleTorch();
  }

  private startScan(): void {
    document.querySelector('body')?.classList.add('barcode-scanning-active');
    BarcodeScanner.startScan();
    this.scannerListener = this.addScannerListener();
  }

  private addScannerListener(): void {
    let lastInvocationTime = 0;
    const throttleDelay = 5000; // 1 second delay

    BarcodeScanner.addListener('barcodeScanned', (event) => {
      if (!this.isBarcodeWithinRectangle(event.barcode)) {
        console.log('Barcode not within the rectangle');
        return;
      }
      this.ngZone.run(() => {
        const currentTime = Date.now();

        // Check if the required delay has passed since the last invocation
        if (currentTime - lastInvocationTime > throttleDelay) {
          lastInvocationTime = currentTime;
          const barcodeValue = event.barcode.displayValue;

          // Process the scanned barcode
          this.handleBarcodeScanned(barcodeValue);
        } else {
          console.log('Scan ignored due to throttling');
        }
      });
    });
  }

  async showErrToast(msg: string) {
    console.log('idhr aya 4');
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      mode: 'ios',
      color: 'danger',
      position: 'middle',
    });

    await toast.present();
  }

  async showSuccesstoast(msg: string) {
    console.log('idhr aya 3');
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      mode: 'ios',
      color: 'success',
      position: 'middle',
    });

    await toast.present();
  }

  handleBarcodeScanned(barcodeValue: string) {
    const item = this.currentOrderList[barcodeValue];
    console.log('idhr aya 1');
    if (!item) {
      this.showErrToast(`SKU not found in order: ${barcodeValue}`);
      return;
    }

    if (item.scannedQuantity < item.expectedQuantity) {
      console.log('idhr aya 2');
      item.scannedQuantity++;
      const notificationMessage =
        item.scannedQuantity === item.expectedQuantity
          ? `${barcodeValue} fully scanned`
          : `Scanned ${barcodeValue}: ${item.scannedQuantity}/${item.expectedQuantity}`;
      this.showSuccesstoast(notificationMessage);
    } else {
      this.showErrToast(`${barcodeValue} already fully scanned`);
    }

    console.log('idhr aya 1');
    // Update the display list after processing the scan
    this.updateDisplayList();
    console.log('Updated barcodeArr:', this.barcodeArr);
  }

  async showCustomNotification(message: string) {
    this.notificationMessage = message;

    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top',
    });

    await toast.present();

    // this.showNotification = true;
    // setTimeout(() => {
    //   this.showNotification = false;
    // }, 2000);
  }

  completeOrder() {
    console.log('Order completed', this.barcodeArr);
  }
  private isBarcodeWithinRectangle(barcode: Barcode): boolean {
    const scaledRect = this.getScaledRectangle();
    const detectionCornerPoints = scaledRect
      ? [
          [scaledRect.left, scaledRect.top],
          [scaledRect.left + scaledRect.width, scaledRect.top],
          [
            scaledRect.left + scaledRect.width,
            scaledRect.top + scaledRect.height,
          ],
          [scaledRect.left, scaledRect.top + scaledRect.height],
        ]
      : undefined;

    const cornerPoints = barcode.cornerPoints;
    if (detectionCornerPoints && cornerPoints) {
      return !(
        detectionCornerPoints[0][0] > cornerPoints[0][0] ||
        detectionCornerPoints[0][1] > cornerPoints[0][1] ||
        detectionCornerPoints[1][0] < cornerPoints[1][0] ||
        detectionCornerPoints[1][1] > cornerPoints[1][1] ||
        detectionCornerPoints[2][0] < cornerPoints[2][0] ||
        detectionCornerPoints[2][1] < cornerPoints[2][1] ||
        detectionCornerPoints[3][0] > cornerPoints[3][0] ||
        detectionCornerPoints[3][1] < cornerPoints[3][1]
      );
    }
    return true;
  }

  private getScaledRectangle() {
    const rect = this.squareElement?.nativeElement.getBoundingClientRect();

    // Calculate the 15% margin for each side
    const marginWidth = rect.width * 0.15;
    const marginHeight = rect.height * 0.15;

    // Adjust the rectangle dimensions to only include the central area
    return {
      left: (rect.left + marginWidth) * window.devicePixelRatio,
      right: (rect.right - marginWidth) * window.devicePixelRatio,
      top: (rect.top + marginHeight) * window.devicePixelRatio,
      bottom: (rect.bottom - marginHeight) * window.devicePixelRatio,
      width: (rect.width - 2 * marginWidth) * window.devicePixelRatio,
      height: (rect.height - 2 * marginHeight) * window.devicePixelRatio,
    };
  }

  private stopScan(): void {
    document.querySelector('body')?.classList.remove('barcode-scanning-active');
    BarcodeScanner.stopScan();
  }
}
