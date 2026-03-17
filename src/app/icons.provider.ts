import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
    PlusCircleOutline,
    ExportOutline,
    CheckCircleFill,
    EyeOutline,
    DownloadOutline,
    PaperClipOutline,
    CommentOutline,
    InboxOutline, UserOutline, SyncOutline, CheckCircleOutline, AppstoreOutline,
    ArrowUpOutline, ArrowDownOutline, LineChartOutline, BarChartOutline,
    PauseCircleOutline,
    PauseOutline,
    StopOutline
} from '@ant-design/icons-angular/icons';

export const provideAppNzIcons = () =>
    provideNzIcons([
        PlusCircleOutline,
        ExportOutline,
        CheckCircleFill,
        EyeOutline,
        DownloadOutline,
        PaperClipOutline,
        CommentOutline,
        InboxOutline, UserOutline, SyncOutline, CheckCircleOutline, AppstoreOutline,
        ArrowUpOutline, ArrowDownOutline, LineChartOutline, BarChartOutline, PauseCircleOutline, PauseOutline, StopOutline
    ]);